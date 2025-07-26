
import * as Phaser from 'phaser';

export type NodeInteractionCallback = (nodeDbId: number) => void;
export type NodesCountCallback = (count: number) => void;

export interface SceneInitData {
  quizId: string;
  playerCharacterUrl: string;
}

export interface NodeData {
    nodeId: number; 
    x: number | null;
    y: number | null;
}

interface ObstacleData {
    posX: number;
    posY: number;
    width: number;
    height: number;
}

interface QuizData {
    map: {
        map_identifier: string;
        title: string;
    };
    questions: {
        node_id: number;
        question: {
            question_id: number;
            question_text: string;
        }
    }[];
}

export default class MainScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  private obstacles?: Phaser.Physics.Arcade.StaticGroup;
  private onNodeInteract!: NodeInteractionCallback; 
  private onNodesCountUpdate!: NodesCountCallback;
  
  private quizId?: string;
  private mapId?: string;
  private playerCharacterUrl?: string;

  private currentBackground?: Phaser.GameObjects.Image;
  private playerSpeed = 200;
  private initialCameraZoomLevel = 1.5;
  private minZoom = 0.5; 
  private maxZoom = 3;
  private zoomIncrement = 0.1;
  private playerScale = 2.0;
  private playerInputEnabled = true;
  private interactionOnCooldown = false;
  private cooldownTimerEvent?: Phaser.Time.TimerEvent;
  private joystickDirection: { x: number; y: number } = { x: 0, y: 0 };
  private highlightedNodeId: number | null = null;
  private nodeCreationData: NodeData[] = [];

  constructor() {
    super({ key: 'MainScene' });
  }

  initScene(
      data: SceneInitData,
      interactCallback: NodeInteractionCallback,
      countCallback: NodesCountCallback
   ) {
    this.quizId = data.quizId;
    this.playerCharacterUrl = data.playerCharacterUrl || '/assets/images/player_placeholder_32.png';
    this.onNodeInteract = interactCallback;
    this.onNodesCountUpdate = countCallback;
    console.log(`[Phaser Scene] MainScene initialized for quiz: ${this.quizId}.`);

    if (!this.onNodeInteract) {
        console.error("[Phaser Scene] initScene called without a valid onNodeInteract callback!");
        this.onNodeInteract = (nodeId) => console.warn(`[Phaser Scene] Default onNodeInteract called for node: ${nodeId}`);
    }
    if (!this.onNodesCountUpdate) {
        console.error("[Phaser Scene] initScene called without a valid onNodesCountUpdate callback!");
        this.onNodesCountUpdate = (count) => console.warn(`[Phaser Scene] Default onNodesCountUpdate called with count: ${count}`);
    }
  }

  preload() {
    console.log("[Phaser Scene] MainScene preload started.");
    if (!this.quizId) {
        console.error("[Phaser Scene] Cannot preload assets without quizId.");
        return;
    }

    // Load quiz data to get mapId and node locations
    this.load.json(`quiz_data_${this.quizId}`, `/api/quizzes/${this.quizId}`);

    // Load player character spritesheet
    if (this.playerCharacterUrl) {
      this.load.spritesheet('player', this.playerCharacterUrl, {
        frameWidth: 32,
        frameHeight: 32,
        endFrame: 127
      });
    }

    this.load.spritesheet('node', '/assets/images/node_placeholder_16.png', {
      frameWidth: 16,
      frameHeight: 16,
      endFrame: 1,
    });
  }

  create() {
    console.log("[Phaser Scene] MainScene create method started.");
    
    const quizData: QuizData = this.cache.json.get(`quiz_data_${this.quizId}`);
    if (!quizData) {
        console.error(`[Phaser Scene] Quiz data for ${this.quizId} not found! Aborting create.`);
        return;
    }
    this.mapId = quizData.map.map_identifier;
    this.nodeCreationData = quizData.questions.map(q => ({
        nodeId: q.node_id,
        // We will fetch the actual coordinates later
        x: null, 
        y: null
    }));

    // Now that we have mapId, load its assets
    this.loadMapAssets();
  }

  loadMapAssets() {
      if (!this.mapId) return;
      console.log(`[Phaser Scene] Loading assets for map: ${this.mapId}`);
      
      const backgroundAssetKey = `${this.mapId}_background`;
      const backgroundUrl = `/assets/images/backgrounds/${this.mapId}_background.png`;
      this.load.image(backgroundAssetKey, backgroundUrl);

      this.load.json(`${this.mapId}_nodes`, `/api/maps/${this.mapId}/nodes`);
      this.load.json(`${this.mapId}_obstacles`, `/api/maps/${this.mapId}/obstacles`);

      // Handle background loading failure
      this.load.once(`fileerror-image-${backgroundAssetKey}`, () => {
          console.error(`[Phaser Scene] Failed to load background image: ${backgroundAssetKey}. Loading default.`);
          if (!this.textures.exists('default_background')) {
              this.load.image('default_background', '/assets/images/backgrounds/default_background.png');
          }
      });

      this.load.on('complete', this.onAssetsLoaded, this);
      this.load.start();
  }

  onAssetsLoaded() {
      console.log("[Phaser Scene] All assets loaded, proceeding with scene setup.");

      this.setupBackground();
      this.setupObstacles();
      this.setupPlayer();
      this.setupQuizNodes();
      this.setupCollisions();
      this.setupControls();
      this.setupCamera();
  }

  setupBackground() {
      let backgroundAssetKey = `default_background`;
      if (this.mapId && this.textures.exists(`${this.mapId}_background`)) {
          backgroundAssetKey = `${this.mapId}_background`;
      }
      
      if (this.textures.exists(backgroundAssetKey)) {
          this.currentBackground = this.add.image(0, 0, backgroundAssetKey).setOrigin(0, 0);
          const bgWidth = this.currentBackground.width;
          const bgHeight = this.currentBackground.height;
          this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
          this.updateMinZoom();
          console.log(`[Phaser Scene] Set background ${backgroundAssetKey} and world bounds: ${bgWidth}x${bgHeight}.`);
      } else {
          console.error("[Phaser Scene] No background texture found.");
          this.cameras.main.setBackgroundColor('#E3F2FD');
      }
  }

  setupObstacles() {
    if (!this.mapId) return;
    this.obstacles = this.physics.add.staticGroup();
    const obstacleData: ObstacleData[] = this.cache.json.get(`${this.mapId}_obstacles`);

    if (obstacleData && Array.isArray(obstacleData)) {
      obstacleData.forEach(obs => {
          const obstacleBody = this.add.rectangle(obs.posX, obs.posY, obs.width, obs.height).setOrigin(0,0);
          this.obstacles?.add(obstacleBody);
          (obstacleBody.body as Phaser.Physics.Arcade.StaticBody).setPosition(obs.posX, obs.posY);
      });
      console.log(`[Phaser Scene] Setup ${obstacleData.length} obstacles for map: ${this.mapId}.`);
    } else {
      console.warn(`[Phaser Scene] No valid obstacle data found for map: ${this.mapId}`);
    }
  }
  
  setupPlayer() {
      if (!this.textures.exists('player')) {
          console.error("[Phaser Scene] Player texture 'player' not loaded.");
          return;
      }
      const playerStartX = this.physics.world.bounds.width / 2;
      const playerStartY = this.physics.world.bounds.height / 2;
      this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player', 0);
      this.player.setScale(this.playerScale).setCollideWorldBounds(true);
      
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
      if (!this.mapId || !this.nodeCreationData.length) return;
      this.nodes = this.physics.add.staticGroup();
      
      const allMapNodes: NodeData[] = this.cache.json.get(`${this.mapId}_nodes`);
      if (!allMapNodes) {
          console.error(`[Phaser Scene] Node coordinate data for map ${this.mapId} not found.`);
          return;
      }

      const allNodesMap = new Map(allMapNodes.map(n => [n.nodeId, n]));

      this.nodeCreationData.forEach(quizNode => {
          const nodeInfo = allNodesMap.get(quizNode.nodeId);
          if (nodeInfo && nodeInfo.x != null && nodeInfo.y != null) {
              const newNode = this.nodes?.create(nodeInfo.x, nodeInfo.y, 'node')
                                .setData('nodeId', nodeInfo.nodeId)
                                .setScale(2)
                                .refreshBody();
              newNode.anims.play('node_active', true);
          } else {
              console.warn(`[Phaser Scene] Could not find coordinates for quiz node ID: ${quizNode.nodeId}`);
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
      const clampedInitialZoom = Phaser.Math.Clamp(this.initialCameraZoomLevel, this.minZoom, this.maxZoom);
      this.cameras.main.setZoom(clampedInitialZoom);

      this.input.on('wheel', (pointer: Phaser.Input.Pointer, _: any, __: any, deltaY: number) => {
          let newZoom = (deltaY > 0) ? this.cameras.main.zoom - this.zoomIncrement : this.cameras.main.zoom + this.zoomIncrement;
          this.cameras.main.zoomTo(Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom), 100);
      });
      this.scale.on('resize', this.handleResize, this);
      this.handleResize(this.scale.gameSize);
  }

  createPlayerAnimations() {
      const frameRate = 10;
      const walkFrames = 4;
      this.anims.create({ key: 'idle_down', frames: [{ key: 'player', frame: 0 }], frameRate: 1 });
      this.anims.create({ key: 'idle_left', frames: [{ key: 'player', frame: 16 }], frameRate: 1 });
      this.anims.create({ key: 'idle_right', frames: [{ key: 'player', frame: 32 }], frameRate: 1 });
      this.anims.create({ key: 'idle_up', frames: [{ key: 'player', frame: 48 }], frameRate: 1 });
      this.anims.create({ key: 'walk_down', frames: this.anims.generateFrameNumbers('player', { start: 1, end: walkFrames }), frameRate, repeat: -1 });
      this.anims.create({ key: 'walk_left', frames: this.anims.generateFrameNumbers('player', { start: 17, end: 16 + walkFrames }), frameRate, repeat: -1 });
      this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('player', { start: 33, end: 32 + walkFrames }), frameRate, repeat: -1 });
      this.anims.create({ key: 'walk_up', frames: this.anims.generateFrameNumbers('player', { start: 49, end: 48 + walkFrames }), frameRate, repeat: -1 });
  }

   createNodeAnimations() {
       this.anims.create({ key: 'node_active', frames: [ { key: 'node', frame: 0 }, { key: 'node', frame: 1 } ], frameRate: 2, repeat: -1, yoyo: true });
   }
  
  handleResize(gameSize: Phaser.Structs.Size) {
     this.updateMinZoom();
     const currentZoom = this.cameras.main.zoom;
     this.cameras.main.setZoom(Phaser.Math.Clamp(currentZoom, this.minZoom, this.maxZoom));
  }

 updateMinZoom() {
    if (!this.currentBackground) return;
    const { width: bgWidth, height: bgHeight } = this.currentBackground;
    const { width: gameWidth, height: gameHeight } = this.scale;
    if (bgWidth > 0 && bgHeight > 0) {
        this.minZoom = Math.max(gameWidth / bgWidth, gameHeight / bgHeight, 0.1);
        this.minZoom = Phaser.Math.Clamp(this.minZoom, 0.1, 1);
    }
 }

   handleNodeOverlap(_: any, node: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
     if (this.interactionOnCooldown || !(node instanceof Phaser.Physics.Arcade.Sprite) || !node.body?.enable) return;
     
     const nodeDbId = node.getData('nodeId') as number;
     if (!nodeDbId || !this.onNodeInteract) return;

     node.disableBody(false, false);
     this.onNodeInteract(nodeDbId);
     this.highlightNode(nodeDbId);
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

       if (nodeToReEnable?.active && nodeToReEnable.body && !nodeToReEnable.body.enable) {
            nodeToReEnable.enableBody(false, 0, 0, true, true);
            nodeToReEnable.anims.play('node_active', true);
       }
   }

   startInteractionCooldown(duration: number) {
        this.interactionOnCooldown = true;
        this.cooldownTimerEvent?.remove();
        this.cooldownTimerEvent = this.time.delayedCall(duration, () => {
            this.interactionOnCooldown = false;
        });
    }

   disablePlayerInput() {
       this.playerInputEnabled = false;
       this.joystickDirection = { x: 0, y: 0 };
       if (this.player?.body) {
         this.player.setVelocity(0);
         const key = this.player.anims.currentAnim?.key;
         if (key?.startsWith('walk_')) {
             this.player.anims.play(key.replace('walk_', 'idle_'), true);
         }
       }
   }

   enablePlayerInput() { this.playerInputEnabled = true; }
   joystickInput(data: { direction?: any; angle: { radian: number; }; }) {
        if (!this.playerInputEnabled) {
             this.joystickDirection = { x: 0, y: 0 };
             return;
        }
        if (data.direction) {
            this.joystickDirection.x = Math.cos(data.angle.radian);
            this.joystickDirection.y = Math.sin(data.angle.radian);
        } else {
            this.joystickDirection.x = 0;
            this.joystickDirection.y = 0;
        }
    }
    highlightNode(nodeDbId: number) {
        if (!this.nodes) return;
        if(this.highlightedNodeId && this.highlightedNodeId !== nodeDbId) {
            this.clearNodeHighlight(this.highlightedNodeId);
        }
        const node = this.nodes.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === nodeDbId) as Phaser.Physics.Arcade.Sprite | undefined;
        if (node && this.highlightedNodeId !== nodeDbId) {
            node.setTint(0xffaa00).setScale(node.scale * 1.2);
            this.highlightedNodeId = nodeDbId;
        }
    }

    clearNodeHighlight(nodeDbId: number | null) {
        if (!this.nodes || !nodeDbId) return;
        const node = this.nodes.getChildren().find(n => (n as Phaser.GameObjects.Sprite).getData('nodeId') === nodeDbId) as Phaser.Physics.Arcade.Sprite | undefined;
        if (node?.active && node.isTinted) {
            node.clearTint().setScale(2); // Reset to original scale
            if (this.highlightedNodeId === nodeDbId) this.highlightedNodeId = null;
        }
    }

    private updateAndEmitNodeCount() {
        if (this.onNodesCountUpdate) {
            const count = this.nodes?.countActive(true) || 0;
            this.onNodesCountUpdate(count);
        }
    }

    public zoomIn() { this.cameras.main.zoomTo(Phaser.Math.Clamp(this.cameras.main.zoom + this.zoomIncrement, this.minZoom, this.maxZoom), 100); }
    public zoomOut() { this.cameras.main.zoomTo(Phaser.Math.Clamp(this.cameras.main.zoom - this.zoomIncrement, this.minZoom, this.maxZoom), 100); }

    update() {
        if (!this.playerInputEnabled || !this.player?.body) {
            this.player?.setVelocity(0);
            return;
        }
        this.player.setVelocity(0);
        let moveX = 0, moveY = 0;

        if (this.cursors?.left.isDown || this.wasdKeys?.A.isDown) moveX = -1;
        else if (this.cursors?.right.isDown || this.wasdKeys?.D.isDown) moveX = 1;
        if (this.cursors?.up.isDown || this.wasdKeys?.W.isDown) moveY = -1;
        else if (this.cursors?.down.isDown || this.wasdKeys?.S.isDown) moveY = 1;

        if (moveX === 0 && moveY === 0 && (this.joystickDirection.x !== 0 || this.joystickDirection.y !== 0)) {
            moveX = this.joystickDirection.x;
            moveY = this.joystickDirection.y;
        }

        if (moveX !== 0 || moveY !== 0) {
            const moveVector = new Phaser.Math.Vector2(moveX, moveY).normalize();
            this.player.setVelocity(moveVector.x * this.playerSpeed, moveVector.y * this.playerSpeed);
            let facing = Math.abs(moveY) > Math.abs(moveX) ? (moveY < 0 ? 'up' : 'down') : (moveX < 0 ? 'left' : 'right');
            this.player.anims.play(`walk_${facing}`, true);
        } else {
            const key = this.player.anims.currentAnim?.key;
            if (key?.startsWith('walk_')) this.player.anims.play(key.replace('walk_', 'idle_'), true);
        }
  }

  shutdown() {
      console.log("[Phaser Scene] Shutdown method called.");
      this.cooldownTimerEvent?.remove();
      this.scale?.off('resize', this.handleResize, this);
      this.load.off('complete', this.onAssetsLoaded, this);
  }

  destroy() {
       this.shutdown();
       super.destroy();
  }
}
