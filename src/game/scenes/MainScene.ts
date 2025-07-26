
import * as Phaser from 'phaser';

// --- Type Definitions ---

export type NodeInteractionCallback = (nodeDbId: number) => void;
export type NodesCountCallback = (count: number) => void;

// The complete data structure for a quiz, passed from React
interface GameData {
    quiz_id: number;
    title: string;
    map: {
        map_identifier: string;
        title: string;
    };
    questions: { node_id: number }[];
}

// Data required to initialize the scene
export interface SceneInitData {
  gameData: GameData;
  playerCharacterUrl: string;
}

// Node position data structure
export interface NodeData {
    nodeId: number; 
    x: number | null;
    y: number | null;
}

// Obstacle data structure from API
interface ObstacleData {
    posX: number;
    posY: number;
    width: number;
    height: number;
}


// --- Main Scene Class ---

export default class MainScene extends Phaser.Scene {
  // Core Properties
  private player?: Phaser.Physics.Arcade.Sprite;
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  
  // Callbacks & Data from React
  private onNodeInteract!: NodeInteractionCallback; 
  private onNodesCountUpdate!: NodesCountCallback;
  private gameData?: GameData;
  private playerCharacterUrl?: string;

  // Input & Controls
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };
  private joystickDirection: { x: number; y: number } = { x: 0, y: 0 };
  private playerInputEnabled = true;

  // Scene State
  private playerSpeed = 200;
  private playerScale = 2.0;
  private interactionOnCooldown = false;
  private highlightedNodeId: number | null = null;
  private currentBackground?: Phaser.GameObjects.Image;
  
  // Camera & Zoom
  private minZoom = 0.5; 
  private maxZoom = 3;
  private zoomIncrement = 0.1;

  constructor() {
    super({ key: 'MainScene' });
  }

  // Receives all necessary data from React before any Phaser methods are called.
  initScene(
      data: SceneInitData,
      interactCallback: NodeInteractionCallback,
      countCallback: NodesCountCallback
   ) {
    this.gameData = data.gameData;
    this.playerCharacterUrl = data.playerCharacterUrl || '/assets/images/player_placeholder_32.png';
    this.onNodeInteract = interactCallback;
    this.onNodesCountUpdate = countCallback;

    console.log(`[Phaser Scene] InitScene called for quiz: "${this.gameData.title}"`);
  }

  preload() {
    if (!this.gameData || !this.playerCharacterUrl) {
      console.error("[Phaser Scene] Preload cannot start without gameData or playerCharacterUrl.");
      return;
    }
    console.log(`[Phaser Scene] Preloading assets for map: ${this.gameData.map.map_identifier}`);

    // Preload all assets in one go
    const mapId = this.gameData.map.map_identifier;
    this.load.spritesheet('player', this.playerCharacterUrl, { frameWidth: 32, frameHeight: 32, endFrame: 127 });
    this.load.spritesheet('node', '/assets/images/node_placeholder_16.png', { frameWidth: 16, frameHeight: 16, endFrame: 1 });
    this.load.image(`${mapId}_background`, `/assets/images/backgrounds/${mapId}_background.png`);
    this.load.json(`${mapId}_nodes`, `/api/maps/${mapId}/nodes`);
    this.load.json(`${mapId}_obstacles`, `/api/maps/${mapId}/obstacles`);
  }

  create() {
    if (!this.gameData) {
        console.error("[Phaser Scene] Create cannot start without gameData.");
        return;
    }
    console.log("[Phaser Scene] Create method started.");
    
    // Setup scene components
    this.setupBackground();
    this.setupObstacles();
    this.setupPlayer();
    this.setupQuizNodes();
    this.setupCollisions();
    this.setupControls();
    this.setupCamera();
  }
  
  // --- SETUP METHODS ---

  setupBackground() {
      const mapId = this.gameData!.map.map_identifier;
      const backgroundKey = `${mapId}_background`;
      
      if (this.textures.exists(backgroundKey)) {
          this.currentBackground = this.add.image(0, 0, backgroundKey).setOrigin(0, 0);
          this.physics.world.setBounds(0, 0, this.currentBackground.width, this.currentBackground.height);
      } else {
          console.warn(`[Phaser Scene] Background for map '${mapId}' not found. Using fallback color.`);
          this.cameras.main.setBackgroundColor('#cccccc');
          this.physics.world.setBounds(0, 0, 2048, 2048); // Default bounds
      }
      this.updateMinZoom();
  }

  setupObstacles() {
    const mapId = this.gameData!.map.map_identifier;
    this.obstacles = this.physics.add.staticGroup();
    const obstacleData: ObstacleData[] = this.cache.json.get(`${mapId}_obstacles`);

    if (obstacleData?.length) {
      obstacleData.forEach(obs => {
          const obstacleBody = this.add.rectangle(obs.posX, obs.posY, obs.width, obs.height).setOrigin(0,0);
          this.obstacles?.add(obstacleBody);
          (obstacleBody.body as Phaser.Physics.Arcade.StaticBody).setPosition(obs.posX, obs.posY);
      });
      console.log(`[Phaser Scene] Setup ${obstacleData.length} obstacles.`);
    }
  }
  
  setupPlayer() {
      if (!this.textures.exists('player')) return;
      
      const { width, height } = this.physics.world.bounds;
      this.player = this.physics.add.sprite(width / 2, height / 2, 'player', 0);
      this.player.setScale(this.playerScale).setCollideWorldBounds(true);
      
      // Fine-tune hitbox
      const hitboxWidth = this.player.width * 0.7;
      const hitboxHeight = this.player.height * 0.8;
      this.player.setBodySize(hitboxWidth, hitboxHeight);
      this.player.setOffset(
        (this.player.width - hitboxWidth) / 2, 
        (this.player.height - hitboxHeight) / 2 + (this.player.height * 0.1)
      );

      this.createPlayerAnimations();
  }

  setupQuizNodes() {
      const mapId = this.gameData!.map.map_identifier;
      this.nodes = this.physics.add.staticGroup();
      
      const allMapNodes: NodeData[] = this.cache.json.get(`${mapId}_nodes`);
      if (!allMapNodes) {
          console.error(`[Phaser Scene] Node coordinate data for map '${mapId}' not found.`);
          return;
      }

      const nodePositions = new Map(allMapNodes.map(n => [n.nodeId, n]));
      const quizNodeIds = new Set(this.gameData!.questions.map(q => q.node_id));

      quizNodeIds.forEach(nodeId => {
          const pos = nodePositions.get(nodeId);
          if (pos && pos.x != null && pos.y != null) {
              this.nodes?.create(pos.x, pos.y, 'node')
                        .setData('nodeId', nodeId)
                        .setScale(2)
                        .refreshBody()
                        .anims.play('node_active', true);
          }
      });
      this.createNodeAnimations();
      this.updateAndEmitNodeCount();
  }

  setupCollisions() {
    if (!this.player) return;
    if (this.obstacles) this.physics.add.collider(this.player, this.obstacles);
    if (this.nodes) this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);
  }

  setupControls() {
      if (this.input.keyboard) {
          this.cursors = this.input.keyboard.createCursorKeys();
          this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as any;
      }
  }
  
  setupCamera() {
      if (!this.player) return;
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height);
      this.cameras.main.setZoom(Phaser.Math.Clamp(1.5, this.minZoom, this.maxZoom));

      this.input.on('wheel', (_: any, __: any, ___: any, deltaY: number) => {
          const newZoom = this.cameras.main.zoom + (deltaY > 0 ? -this.zoomIncrement : this.zoomIncrement);
          this.cameras.main.zoomTo(Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom), 100);
      });
      this.scale.on('resize', this.handleResize, this);
  }

  // --- ANIMATIONS ---

  createPlayerAnimations() {
      ['down', 'left', 'right', 'up'].forEach((dir, i) => {
        const startFrame = i * 16;
        this.anims.create({ key: `idle_${dir}`, frames: [{ key: 'player', frame: startFrame }] });
        this.anims.create({ key: `walk_${dir}`, frames: this.anims.generateFrameNumbers('player', { start: startFrame + 1, end: startFrame + 4 }), frameRate: 10, repeat: -1 });
      });
  }

   createNodeAnimations() {
       if (!this.anims.exists('node_active')) {
          this.anims.create({ key: 'node_active', frames: this.anims.generateFrameNumbers('node', { start: 0, end: 1 }), frameRate: 2, repeat: -1, yoyo: true });
       }
   }
  
  // --- EVENT HANDLERS & PUBLIC METHODS ---

  handleNodeOverlap(_: any, node: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
     if (this.interactionOnCooldown || !(node instanceof Phaser.Physics.Arcade.Sprite) || !node.body?.enable) return;
     
     const nodeDbId = node.getData('nodeId') as number;
     if (nodeDbId && this.onNodeInteract) {
        node.disableBody(false, false);
        this.onNodeInteract(nodeDbId);
        this.highlightNode(nodeDbId);
     }
   }
   
   joystickInput(data: { direction?: any; angle: { radian: number; }; }) {
        if (!this.playerInputEnabled) {
             this.joystickDirection = { x: 0, y: 0 };
             return;
        }
        if (data.direction) {
            this.joystickDirection.x = Math.cos(data.angle.radian);
            this.joystickDirection.y = Math.sin(data.angle.radian);
        } else {
            this.joystickDirection = { x: 0, y: 0 };
        }
    }

   removeNode(nodeDbId: number) {
     if (!this.nodes) return;
     this.clearNodeHighlight(nodeDbId);
     const nodeToRemove = this.nodes.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === nodeDbId);
     if (nodeToRemove) {
         nodeToRemove.destroy();
         this.updateAndEmitNodeCount();
     }
   }

   reEnableNode(nodeDbId: number) {
       if (!this.nodes) return;
       this.clearNodeHighlight(nodeDbId);
       const nodeToReEnable = this.nodes.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === nodeDbId) as Phaser.Physics.Arcade.Sprite | undefined;

       if (nodeToReEnable?.active && !nodeToReEnable.body?.enable) {
            nodeToReEnable.enableBody(true, nodeToReEnable.x, nodeToReEnable.y, true, true);
            nodeToReEnable.anims.play('node_active', true);
       }
   }

   disablePlayerInput() {
       this.playerInputEnabled = false;
       this.joystickDirection = { x: 0, y: 0 };
       if (this.player?.body) {
         this.player.setVelocity(0);
         const key = this.player.anims.currentAnim?.key;
         if (key?.startsWith('walk_')) this.player.anims.play(key.replace('walk_', 'idle_'), true);
       }
   }

   enablePlayerInput() { this.playerInputEnabled = true; }
   public zoomIn() { this.cameras.main.zoomTo(Phaser.Math.Clamp(this.cameras.main.zoom + this.zoomIncrement, this.minZoom, this.maxZoom), 100); }
   public zoomOut() { this.cameras.main.zoomTo(Phaser.Math.Clamp(this.cameras.main.zoom - this.zoomIncrement, this.minZoom, this.maxZoom), 100); }

   // --- GAME LOOP & UTILS ---
   
  update() {
    if (!this.playerInputEnabled || !this.player?.body) {
        this.player?.setVelocity(0);
        return;
    }
    
    let moveX = this.joystickDirection.x;
    let moveY = this.joystickDirection.y;

    if (moveX === 0 && moveY === 0) { // Keyboard fallback
        if (this.cursors?.left.isDown || this.wasdKeys?.A.isDown) moveX = -1;
        else if (this.cursors?.right.isDown || this.wasdKeys?.D.isDown) moveX = 1;
        if (this.cursors?.up.isDown || this.wasdKeys?.W.isDown) moveY = -1;
        else if (this.cursors?.down.isDown || this.wasdKeys?.S.isDown) moveY = 1;
    }

    if (moveX !== 0 || moveY !== 0) {
        const moveVector = new Phaser.Math.Vector2(moveX, moveY).normalize();
        this.player.setVelocity(moveVector.x * this.playerSpeed, moveVector.y * this.playerSpeed);
        const facing = Math.abs(moveY) > Math.abs(moveX) ? (moveY < 0 ? 'up' : 'down') : (moveX < 0 ? 'left' : 'right');
        this.player.anims.play(`walk_${facing}`, true);
    } else {
        const key = this.player.anims.currentAnim?.key;
        if (key?.startsWith('walk_')) this.player.anims.play(key.replace('walk_', 'idle_'), true);
        else if (!this.player.anims.isPlaying) this.player.anims.play('idle_down');
    }
  }

  private updateAndEmitNodeCount() {
      if (this.onNodesCountUpdate) this.onNodesCountUpdate(this.nodes?.countActive(true) || 0);
  }
  
  private handleResize() {
     this.updateMinZoom();
     this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom, this.minZoom, this.maxZoom));
  }

  private updateMinZoom() {
    if (!this.currentBackground) return;
    const { width: bgWidth, height: bgHeight } = this.currentBackground;
    const { width: gameWidth, height: gameHeight } = this.scale;
    if (bgWidth > 0 && gameHeight > 0) {
        this.minZoom = Phaser.Math.Clamp(Math.max(gameWidth / bgWidth, gameHeight / bgHeight), 0.1, 1);
    }
  }

  private highlightNode(nodeDbId: number) {
    this.clearNodeHighlight(); // Clear previous highlight
    const node = this.nodes?.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === nodeDbId) as Phaser.Physics.Arcade.Sprite | undefined;
    if (node) {
        node.setTint(0xffaa00).setScale(node.scale * 1.2);
        this.highlightedNodeId = nodeDbId;
    }
  }

  private clearNodeHighlight() {
    if (!this.highlightedNodeId || !this.nodes) return;
    const node = this.nodes.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === this.highlightedNodeId) as Phaser.Physics.Arcade.Sprite | undefined;
    if (node?.active) node.clearTint().setScale(2);
    this.highlightedNodeId = null;
  }

  // --- LIFECYCLE ---
  
  shutdown() {
      console.log("[Phaser Scene] Shutdown.");
      this.scale?.off('resize', this.handleResize, this);
  }
}
