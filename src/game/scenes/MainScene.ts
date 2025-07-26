
import * as Phaser from 'phaser';

// --- TYPE DEFINITIONS ---

// Callbacks to communicate from Phaser back to React
export type NodeInteractionCallback = (nodeDbId: number) => void;
export type NodesCountCallback = (count: number) => void;

// Data structure for a single node's position
export interface NodeData {
    nodeId: number; 
    x: number | null;
    y: number | null;
}

// Data structure for the entire quiz payload
interface GameData {
    quiz_id: number;
    title: string;
    map: {
        map_identifier: string;
        title: string;
    };
    questions: { node_id: number }[];
}

// Data passed from React to initialize the scene
export interface SceneInitData {
  gameData: GameData;
  playerCharacterUrl: string;
  interactCallback: NodeInteractionCallback;
  countCallback: NodesCountCallback;
}

interface ObstacleData {
    posX: number;
    posY: number;
    width: number;
    height: number;
}


// --- MAIN SCENE CLASS ---

export default class MainScene extends Phaser.Scene {
  // Core Game Objects
  private player?: Phaser.Physics.Arcade.Sprite;
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  
  // Data & Callbacks from React
  private onNodeInteract!: NodeInteractionCallback; 
  private onNodesCountUpdate!: NodesCountCallback;
  private gameData!: GameData; // Is guaranteed to be present by `init`
  private playerCharacterUrl!: string;

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

  // Standard Phaser method to get data from scene.start()
  init(data: SceneInitData) {
    this.gameData = data.gameData;
    this.playerCharacterUrl = data.playerCharacterUrl;
    this.onNodeInteract = data.interactCallback;
    this.onNodesCountUpdate = data.countCallback;
    console.log(`[Phaser Scene] Initialized with data for quiz: ${this.gameData.quiz_id}`);
  }

  // Preload all necessary assets based on the init data
  preload() {
    if (!this.gameData) {
      console.error("[Phaser Scene] Game data is missing in preload. Aborting.");
      return;
    }
    const mapId = this.gameData.map.map_identifier;
    console.log(`[Phaser Scene] Preloading assets for map: ${mapId}`);

    // Load all assets in one go
    this.load.spritesheet('player', this.playerCharacterUrl, { frameWidth: 32, frameHeight: 32, endFrame: 127 });
    this.load.spritesheet('node', '/assets/images/node_placeholder_16.png', { frameWidth: 16, frameHeight: 16, endFrame: 1 });
    
    const backgroundAssetKey = `${mapId}_background`;
    this.load.image(backgroundAssetKey, `/assets/images/backgrounds/${mapId}_background.png`);
    this.load.image('default_background', '/assets/images/backgrounds/default_background.png');
    
    this.load.json(`${mapId}_nodes`, `/api/maps/${mapId}/nodes`);
    this.load.json(`${mapId}_obstacles`, `/api/maps/${mapId}/obstacles`);
  }

  // Create game objects after all assets are loaded
  create() {
    if (!this.gameData) {
      console.error("[Phaser Scene] Game data is missing in create. Aborting.");
      return;
    }
    console.log("[Phaser Scene] Create method started.");
    
    // The order of setup is important
    this.setupBackground();
    this.setupObstacles();
    this.setupPlayer();
    this.setupQuizNodes();
    this.setupCollisions();
    this.setupCamera();
    this.setupControls();
  }

  // --- SETUP METHODS ---

  setupBackground() {
    const mapId = this.gameData.map.map_identifier;
    let backgroundAssetKey = this.textures.exists(`${mapId}_background`) ? `${mapId}_background` : 'default_background';
    
    this.currentBackground = this.add.image(0, 0, backgroundAssetKey).setOrigin(0, 0);
    const { width, height } = this.currentBackground;
    this.physics.world.setBounds(0, 0, width, height);
    this.updateMinZoom();
    console.log(`[Phaser Scene] Background '${backgroundAssetKey}' set with bounds: ${width}x${height}.`);
  }

  setupObstacles() {
    const mapId = this.gameData.map.map_identifier;
    this.obstacles = this.physics.add.staticGroup();
    const obstacleData: ObstacleData[] = this.cache.json.get(`${mapId}_obstacles`);

    if (obstacleData?.length) {
      obstacleData.forEach(obs => {
          const body = this.add.rectangle(obs.posX, obs.posY, obs.width, obs.height).setOrigin(0, 0);
          this.obstacles?.add(body);
          (body.body as Phaser.Physics.Arcade.StaticBody).setPosition(obs.posX, obs.posY);
      });
      console.log(`[Phaser Scene] Setup ${obstacleData.length} obstacles.`);
    }
  }
  
  setupPlayer() {
      const { width, height } = this.physics.world.bounds;
      this.player = this.physics.add.sprite(width / 2, height / 2, 'player', 0);
      this.player.setScale(this.playerScale).setCollideWorldBounds(true);
      
      const hitboxWidth = this.player.width * 0.7;
      const hitboxHeight = this.player.height * 0.8;
      this.player.setBodySize(hitboxWidth, hitboxHeight);
      this.player.setOffset((this.player.width - hitboxWidth) / 2, (this.player.height - hitboxHeight) / 2 + (this.player.height * 0.1));
      this.createPlayerAnimations();
  }

  setupQuizNodes() {
      const mapId = this.gameData.map.map_identifier;
      this.nodes = this.physics.add.staticGroup();
      const allMapNodes: NodeData[] = this.cache.json.get(`${mapId}_nodes`);
      
      if (!allMapNodes) {
          console.error(`[Phaser Scene] Node coordinate data for map ${mapId} not found.`);
          return;
      }
      const allNodesMap = new Map(allMapNodes.map(n => [n.nodeId, n]));

      this.gameData.questions.forEach(quizNode => {
          const nodeInfo = allNodesMap.get(quizNode.node_id);
          if (nodeInfo && nodeInfo.x != null && nodeInfo.y != null) {
              const newNode = this.nodes?.create(nodeInfo.x, nodeInfo.y, 'node')
                                .setData('nodeId', nodeInfo.node_id)
                                .setScale(2)
                                .refreshBody();
              newNode.anims.play('node_active', true);
          }
      });
      this.createNodeAnimations();
      this.updateAndEmitNodeCount();
      console.log(`[Phaser Scene] Created ${this.nodes.countActive(true)} quiz nodes.`);
  }

  setupCollisions() {
    if (this.player) {
      if(this.obstacles) this.physics.add.collider(this.player, this.obstacles);
      if(this.nodes) this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);
    }
  }
  
  setupCamera() {
      if (!this.player) return;
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height);
      this.cameras.main.setZoom(Phaser.Math.Clamp(1.5, this.minZoom, this.maxZoom));
      this.scale.on('resize', this.handleResize, this);
  }

  setupControls() {
      if (this.input.keyboard) {
          this.cursors = this.input.keyboard.createCursorKeys();
          this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as any;
      }
       this.input.on('wheel', (_: any, __: any, ___: any, deltaY: number) => {
          const newZoom = (deltaY > 0) ? this.cameras.main.zoom - this.zoomIncrement : this.cameras.main.zoom + this.zoomIncrement;
          this.cameras.main.zoomTo(Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom), 100);
      });
  }

  // --- ANIMATIONS ---

  createPlayerAnimations() {
      const anims = ['idle_down:0', 'idle_left:16', 'idle_right:32', 'idle_up:48'];
      anims.forEach(anim => {
          const [key, frame] = anim.split(':');
          this.anims.create({ key, frames: [{ key: 'player', frame: parseInt(frame) }] });
      });
      const walkAnims = ['walk_down:1-4', 'walk_left:17-20', 'walk_right:33-36', 'walk_up:49-52'];
      walkAnims.forEach(anim => {
          const [key, frames] = anim.split(':');
          const [start, end] = frames.split('-').map(Number);
          this.anims.create({ key, frames: this.anims.generateFrameNumbers('player', { start, end }), frameRate: 10, repeat: -1 });
      });
  }

  createNodeAnimations() {
       this.anims.create({ key: 'node_active', frames: this.anims.generateFrameNumbers('node', { start: 0, end: 1 }), frameRate: 2, repeat: -1, yoyo: true });
  }
  
  // --- CORE LOGIC & UPDATE ---

  handleResize() {
     this.updateMinZoom();
     this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom, this.minZoom, this.maxZoom));
  }

  updateMinZoom() {
    if (!this.currentBackground) return;
    const { width: bgWidth, height: bgHeight } = this.currentBackground;
    const { width: gameWidth, height: gameHeight } = this.scale;
    if (bgWidth > 0 && gameWidth > 0) {
        this.minZoom = Math.max(gameWidth / bgWidth, gameHeight / bgHeight, 0.1);
    }
  }

  handleNodeOverlap(_: any, node: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
     if (this.interactionOnCooldown || !(node instanceof Phaser.Physics.Arcade.Sprite) || !node.body?.enable) return;
     const nodeDbId = node.getData('nodeId') as number;
     if (nodeDbId) {
        node.disableBody(false, false);
        this.onNodeInteract(nodeDbId);
        this.highlightNode(nodeDbId);
     }
  }
 
  update() {
    if (!this.player?.body || !this.playerInputEnabled) {
      this.player?.setVelocity(0);
      return;
    }
    
    let moveX = this.joystickDirection.x;
    let moveY = this.joystickDirection.y;

    if(moveX === 0 && moveY === 0) {
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
    }
  }

  // --- PUBLIC METHODS (CALLED FROM REACT) ---

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
       if (nodeToReEnable?.active && nodeToReEnable.body && !nodeToReEnable.body.enable) {
            nodeToReEnable.enableBody(false, 0, 0, true, true);
            nodeToReEnable.anims.play('node_active', true);
       }
  }

   disablePlayerInput() {
       this.playerInputEnabled = false;
       this.joystickDirection = { x: 0, y: 0 };
   }

   enablePlayerInput() { this.playerInputEnabled = true; }

   joystickInput(data: { direction?: any; angle: { radian: number; }; }) {
        if (!this.playerInputEnabled) return;
        if (data.direction) {
            this.joystickDirection.x = Math.cos(data.angle.radian);
            this.joystickDirection.y = Math.sin(data.angle.radian);
        } else {
            this.joystickDirection = { x: 0, y: 0 };
        }
    }

    highlightNode(nodeDbId: number) {
        if(this.highlightedNodeId) this.clearNodeHighlight(this.highlightedNodeId);
        const node = this.nodes?.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === nodeDbId) as Phaser.Physics.Arcade.Sprite;
        if (node) {
            node.setTint(0xffaa00).setScale(node.scale * 1.2);
            this.highlightedNodeId = nodeDbId;
        }
    }

    clearNodeHighlight(nodeDbId: number | null) {
        if (!nodeDbId) return;
        const node = this.nodes?.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === nodeDbId) as Phaser.Physics.Arcade.Sprite;
        if (node?.active && node.isTinted) {
            node.clearTint().setScale(2);
            if (this.highlightedNodeId === nodeDbId) this.highlightedNodeId = null;
        }
    }

    public zoomIn() { this.cameras.main.zoomTo(Phaser.Math.Clamp(this.cameras.main.zoom + this.zoomIncrement, this.minZoom, this.maxZoom), 100); }
    public zoomOut() { this.cameras.main.zoomTo(Phaser.Math.Clamp(this.cameras.main.zoom - this.zoomIncrement, this.minZoom, this.maxZoom), 100); }
    private updateAndEmitNodeCount() { this.onNodesCountUpdate(this.nodes?.countActive(true) || 0); }
}
