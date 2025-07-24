
import * as Phaser from 'phaser';
import type { JoystickManager, JoystickOutputData } from 'nipplejs'; // Import types for joystick data

// Define the types for the interaction callback (sends numeric DB ID)
export type NodeInteractionCallback = (nodeDbId: number) => void;
// Define the type for the nodes count callback
export type NodesCountCallback = (count: number) => void;


// Define the type for initialization data passed from React
export interface SceneInitData {
  mapId: string;
}

// Define the structure for node data passed from React
export interface NodeData {
    nodeId: number; // Use numeric database ID
    x: number | null;
    y: number | null;
}

export default class MainScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; }; // Added for WASD
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  private onNodeInteract!: NodeInteractionCallback; // Should be set in initScene
  private onNodesCountUpdate!: NodesCountCallback; // Callback for node count
  private mapId?: string;
  private currentBackground?: Phaser.GameObjects.Image;
  private playerSpeed = 200; // Player movement speed
  private initialCameraZoomLevel = 1.5; // Initial zoom level
  private minZoom = 0.5; // Minimum zoom level (will be recalculated based on background)
  private maxZoom = 3; // Maximum zoom level
  private zoomIncrement = 0.1; // How much to zoom per step (mouse wheel or button)
  private playerScale = 2.0; // Make player larger
  private playerInputEnabled = true; // Flag to control player movement input
  private interactionOnCooldown = false; // Flag to manage node interaction cooldown
  private cooldownTimerEvent?: Phaser.Time.TimerEvent; // Timer event for cooldown
  private joystickDirection: { x: number; y: number } = { x: 0, y: 0 }; // Store joystick vector
  private highlightedNodeId: number | null = null; // Track the currently highlighted node's DB ID
  private nodeCreationData: NodeData[] = []; // Store node data received from React


  constructor() {
    super({ key: 'MainScene' });
  }

  // Updated method to receive initialization data, callbacks, and node data
  initScene(
      data: SceneInitData,
      interactCallback: NodeInteractionCallback,
      countCallback: NodesCountCallback,
      nodesToCreate: NodeData[] // Receive node data here
   ) {
    this.mapId = data.mapId;
    this.onNodeInteract = interactCallback;
    this.onNodesCountUpdate = countCallback; // Store the count callback
    this.nodeCreationData = nodesToCreate; // Store node data for use in create()
    console.log(`[Phaser Scene] MainScene initialized for map: ${this.mapId} with ${nodesToCreate.length} nodes to create.`);

    if (!this.onNodeInteract) {
        console.error("[Phaser Scene] initScene called without a valid onNodeInteract callback!");
        this.onNodeInteract = (nodeId) => console.warn(`[Phaser Scene] Default onNodeInteract called for node: ${nodeId}`);
    }
    if (!this.onNodesCountUpdate) {
        console.error("[Phaser Scene] initScene called without a valid onNodesCountUpdate callback!");
        this.onNodesCountUpdate = (count) => console.warn(`[Phaser Scene] Default onNodesCountUpdate called with count: ${count}`);
    }
}


  preloadAssets() {
    console.log("[Phaser Scene] Preloading common assets...");
    this.load.spritesheet('player', '/assets/images/player_placeholder_32.png', {
      frameWidth: 32,
      frameHeight: 32,
      endFrame: 127,
    });
    this.load.spritesheet('node', '/assets/images/node_placeholder_16.png', {
      frameWidth: 16,
      frameHeight: 16,
      endFrame: 1,
    });

    if (this.mapId) {
        const backgroundAssetKey = `${this.mapId}_background`;
        // The URL now includes the mapId as the filename
        const backgroundUrl = `/assets/images/backgrounds/${this.mapId}_background.png`;
        console.log(`[Phaser Scene] Attempting to preload background: ${backgroundAssetKey} from ${backgroundUrl}`);
        this.load.image(backgroundAssetKey, backgroundUrl);

        this.load.once(`fileerror-image-${backgroundAssetKey}`, (file: Phaser.Loader.File) => {
            console.error(`[Phaser Scene] Failed to load background image: ${file.key} from ${file.url}. Loading default.`);
            if (!this.textures.exists('default_background')) {
                this.load.image('default_background', '/assets/images/backgrounds/default_background.png');
            }
        });
    } else {
         console.warn("[Phaser Scene] mapId missing during preload, attempting to load default background.");
        if (!this.textures.exists('default_background')) {
             this.load.image('default_background', '/assets/images/backgrounds/default_background.png');
        }
    }
  }

  preload() {
    console.log("[Phaser Scene] MainScene preload started.");
    if (!this.mapId) {
        console.error("[Phaser Scene] Cannot preload assets without mapId. Ensure initScene is called before preload.");
        this.mapId = 'default';
    }

    this.preloadAssets();

     this.load.on('loaderror', (file: Phaser.Loader.File) => {
         console.error(`[Phaser Scene Load Error] Failed to load file: ${file.key} from ${file.url}. Error type: ${file.type}, Status: ${file.xhrLoader?.status} ${file.xhrLoader?.statusText}`);
     });
     this.load.on('complete', () => {
        console.log("[Phaser Scene] Asset loading complete.");
     });
  }

  createPlayerAnimations() {
      const frameRate = 10;
      const walkFrames = 4;

      this.anims.create({ key: 'idle_down', frames: [{ key: 'player', frame: 0 }], frameRate: 1 });
      this.anims.create({ key: 'idle_left', frames: [{ key: 'player', frame: 16 }], frameRate: 1 });
      this.anims.create({ key: 'idle_right', frames: [{ key: 'player', frame: 32 }], frameRate: 1 });
      this.anims.create({ key: 'idle_up', frames: [{ key: 'player', frame: 48 }], frameRate: 1 });

      this.anims.create({
          key: 'walk_down',
          frames: this.anims.generateFrameNumbers('player', { start: 1, end: walkFrames }),
          frameRate: frameRate,
          repeat: -1
      });
      this.anims.create({
          key: 'walk_left',
          frames: this.anims.generateFrameNumbers('player', { start: 17, end: 16 + walkFrames }),
          frameRate: frameRate,
          repeat: -1
      });
       this.anims.create({
          key: 'walk_right',
          frames: this.anims.generateFrameNumbers('player', { start: 33, end: 32 + walkFrames }),
          frameRate: frameRate,
          repeat: -1
      });
      this.anims.create({
          key: 'walk_up',
          frames: this.anims.generateFrameNumbers('player', { start: 49, end: 48 + walkFrames }),
          frameRate: frameRate,
          repeat: -1
      });
      console.log("[Phaser Scene] Player animations created.");
  }

   createNodeAnimations() {
       this.anims.create({
           key: 'node_active',
           frames: [ { key: 'node', frame: 0 }, { key: 'node', frame: 1 } ],
           frameRate: 2,
           repeat: -1,
           yoyo: true
       });
       console.log("[Phaser Scene] Node animations created.");
   }

  create() {
    console.log("[Phaser Scene] MainScene create method started.");

    let backgroundAssetKey = `default_background`;
    if (this.mapId && this.textures.exists(`${this.mapId}_background`)) {
        backgroundAssetKey = `${this.mapId}_background`;
    } else if (this.mapId && !this.textures.exists(`${this.mapId}_background`) && this.textures.exists('default_background')) {
        console.warn(`[Phaser Scene] Map-specific background '${this.mapId}_background' not found, using default.`);
        backgroundAssetKey = 'default_background';
    } else if (!this.textures.exists('default_background')) {
        console.error("[Phaser Scene] Default background texture 'default_background' not loaded.");
        this.cameras.main.setBackgroundColor('#E3F2FD');
        const defaultWidth = 1600; const defaultHeight = 1200;
        this.physics.world.setBounds(0, 0, defaultWidth, defaultHeight);
        this.cameras.main.setBounds(0, 0, defaultWidth, defaultHeight);
        console.warn(`[Phaser Scene] Using fallback background color and bounds: ${defaultWidth}x${defaultHeight}`);
    }

    if (this.textures.exists(backgroundAssetKey)) {
        this.currentBackground = this.add.image(0, 0, backgroundAssetKey).setOrigin(0, 0);
        const bgWidth = this.currentBackground.width;
        const bgHeight = this.currentBackground.height;
        this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
        this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
        this.minZoom = 0.3;
        this.updateMinZoom();
        console.log(`[Phaser Scene] Set background ${backgroundAssetKey} and world bounds: ${bgWidth}x${bgHeight}.`);
    }

    if (!this.textures.exists('player')) {
         console.error("[Phaser Scene] Player texture 'player' not loaded.");
          const placeholder = this.add.graphics().fillStyle(0x1A237E, 1);
          const worldCenterX = this.physics.world.bounds.width / 2;
          const worldCenterY = this.physics.world.bounds.height / 2;
          placeholder.fillRect(worldCenterX - 16, worldCenterY - 16, 32, 32);
          return;
    }

    const playerStartX = this.physics.world.bounds.width / 2;
    const playerStartY = this.physics.world.bounds.height / 2;
    this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player', 0);
    this.player.setScale(this.playerScale);
    this.player.setCollideWorldBounds(true);
    const hitboxWidth = this.player.width * 0.7;
    const hitboxHeight = this.player.height * 0.8;
    this.player.setBodySize(hitboxWidth, hitboxHeight);
    const offsetX = (this.player.width - hitboxWidth) / 2;
    const offsetY = (this.player.height - hitboxHeight) / 2 + (this.player.height * 0.1);
    this.player.setOffset(offsetX, offsetY);
    this.createPlayerAnimations();


    this.nodes = this.physics.add.staticGroup();
    if (!this.textures.exists('node')) {
      console.error("[Phaser Scene] Node texture 'node' not loaded.");
    } else {
        console.log("[Phaser Scene] Creating nodes based on nodeCreationData...");
        this.setupNodes(this.nodeCreationData);
        this.createNodeAnimations();
        this.nodes.children.iterate(child => {
            const node = child as Phaser.Physics.Arcade.Sprite;
            node.anims.play('node_active', true);
            return true;
        });
        this.updateAndEmitNodeCount();
        console.log(`[Phaser Scene] Initial node count: ${this.nodes.countActive(true)}`);
    }

    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);

    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as any;
    }

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    const clampedInitialZoom = Phaser.Math.Clamp(this.initialCameraZoomLevel, this.minZoom, this.maxZoom);
    this.cameras.main.setZoom(clampedInitialZoom);
     console.log(`[Phaser Scene] Initial camera zoom set to: ${clampedInitialZoom}`);

    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
        let newZoom = (deltaY > 0) ? this.cameras.main.zoom - this.zoomIncrement : this.cameras.main.zoom + this.zoomIncrement;
        newZoom = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom);
        this.cameras.main.zoomTo(newZoom, 100);
    });

     this.scale.on('resize', this.handleResize, this);
     this.handleResize(this.scale.gameSize);
     console.log("[Phaser Scene] MainScene create method finished.");
  }

  handleResize(gameSize: Phaser.Structs.Size) {
     const width = gameSize.width;
     const height = gameSize.height;
     console.log(`[Phaser Scene] Resize event detected: ${width}x${height}`);
     this.updateMinZoom();
     const currentZoom = this.cameras.main.zoom;
     const newClampedZoom = Phaser.Math.Clamp(currentZoom, this.minZoom, this.maxZoom);
     if (newClampedZoom !== currentZoom) {
         this.cameras.main.setZoom(newClampedZoom);
     }
 }

 updateMinZoom() {
    if (!this.currentBackground) return;
    const bgWidth = this.currentBackground.width;
    const bgHeight = this.currentBackground.height;
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    if (bgWidth <= 0 || bgHeight <= 0 || gameWidth <= 0 || gameHeight <= 0) {
        this.minZoom = 0.1;
        return;
    }
    const zoomFitWidth = gameWidth / bgWidth;
    const zoomFitHeight = gameHeight / bgHeight;
    this.minZoom = Math.max(zoomFitWidth, zoomFitHeight, 0.1);
    this.minZoom = Phaser.Math.Clamp(this.minZoom, 0.1, 1);
    console.log(`[Phaser Scene] Min zoom recalculated: ${this.minZoom.toFixed(3)}`);
 }

   handleNodeOverlap(player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
                     node: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile)
   {
     if (!node || !(node instanceof Phaser.Physics.Arcade.Sprite) || !node.body) {
       return;
     }
     if (this.interactionOnCooldown || !node.body.enable) {
         return;
     }
     const spriteNode = node as Phaser.Physics.Arcade.Sprite;
     const nodeDbId = typeof spriteNode.getData === 'function' ? spriteNode.getData('nodeId') as number : null;

     if (!nodeDbId || !this.onNodeInteract) {
       console.error("[Overlap] Node overlap detected, but callback or nodeId is missing!");
       return;
     }
     console.log(`[Overlap] Player overlapped with node DB ID: ${nodeDbId}`);

     try {
        spriteNode.disableBody(false, false);
     } catch (error) {
         console.warn(`[Overlap] Error disabling body for node ${nodeDbId}:`, error);
         return;
     }
     this.onNodeInteract(nodeDbId);
     this.highlightNode(nodeDbId);
   }

   removeNode(nodeDbId: number) {
     console.log(`[Phaser Scene] Attempting to remove node DB ID: ${nodeDbId}`);
     if (!this.nodes) return;
     this.clearNodeHighlight(nodeDbId);
     try {
         const nodeToRemove = this.nodes.getChildren().find(node => {
           const spriteNode = node as Phaser.Physics.Arcade.Sprite;
           return typeof spriteNode.getData === 'function' && spriteNode.getData('nodeId') === nodeDbId;
         }) as Phaser.Physics.Arcade.Sprite | undefined;

         if (nodeToRemove && nodeToRemove.active) {
             nodeToRemove.destroy();
             this.updateAndEmitNodeCount();
             console.log(`[Phaser Scene] Node ${nodeDbId} destroyed.`);
         } else {
            this.updateAndEmitNodeCount();
         }
      } catch (error) {
           console.error(`[Phaser Scene] Error during node removal for ${nodeDbId}:`, error);
           this.updateAndEmitNodeCount();
      }
   }

   reEnableNode(nodeDbId: number) {
        console.log(`[Phaser Scene] Attempting to re-enable node: ${nodeDbId}`);
       if (!this.nodes) return;
        this.clearNodeHighlight(nodeDbId);
        try {
           const nodeToReEnable = this.nodes.getChildren().find(node => {
               const spriteNode = node as Phaser.Physics.Arcade.Sprite;
               return typeof spriteNode.getData === 'function' && spriteNode.getData('nodeId') === nodeDbId;
           }) as Phaser.Physics.Arcade.Sprite | undefined;

           if (nodeToReEnable && nodeToReEnable.active) {
               if(nodeToReEnable.body && !nodeToReEnable.body.enable){
                    nodeToReEnable.enableBody(false, 0, 0, true, true);
               }
               if (!nodeToReEnable.anims.isPlaying) {
                  nodeToReEnable.anims.play('node_active', true);
               }
           }
        } catch (error) {
            console.error(`[Phaser Scene] Error during node re-enable for ${nodeDbId}:`, error);
        }
   }

   startInteractionCooldown(duration: number) {
        try {
            this.interactionOnCooldown = true;
            if (this.cooldownTimerEvent) {
                this.cooldownTimerEvent.remove(false);
            }
            this.cooldownTimerEvent = this.time.delayedCall(duration, () => {
                this.interactionOnCooldown = false;
                 this.cooldownTimerEvent = undefined;
            }, [], this);
        } catch (error) {
             console.error("[Phaser Scene] Error starting interaction cooldown timer:", error);
             this.interactionOnCooldown = false;
        }
    }

   disablePlayerInput() {
       this.playerInputEnabled = false;
       this.joystickDirection = { x: 0, y: 0 };
       if (this.player?.body) {
         try {
            this.player.setVelocity(0);
             const currentAnimKey = this.player.anims.currentAnim?.key;
             if (currentAnimKey && currentAnimKey.startsWith('walk_')) {
                 const facing = currentAnimKey.split('_')[1];
                 this.player.anims.play(`idle_${facing}`, true);
             } else {
                 this.player.anims.play('idle_down', true);
             }
         } catch (error) {
             console.warn("[Phaser Scene] Error stopping player during disablePlayerInput:", error);
         }
       }
   }

   enablePlayerInput() {
       this.playerInputEnabled = true;
   }

   joystickInput(data: JoystickOutputData) {
        if (!this.playerInputEnabled) {
             if(this.joystickDirection.x !== 0 || this.joystickDirection.y !== 0){
                this.joystickDirection = { x: 0, y: 0 };
             }
             return;
        }
        if (data.direction) {
            const angle = data.angle.radian;
            this.joystickDirection.x = Math.cos(angle);
            this.joystickDirection.y = Math.sin(angle); // Phaser's Y is downwards
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
        try {
            const nodeToHighlight = this.nodes.getChildren().find(node => {
                return (node as Phaser.Physics.Arcade.Sprite).getData('nodeId') === nodeDbId;
            }) as Phaser.Physics.Arcade.Sprite | undefined;

            if (nodeToHighlight && this.highlightedNodeId !== nodeDbId) {
                nodeToHighlight.setTint(0xffaa00);
                nodeToHighlight.setScale(nodeToHighlight.scale * 1.2);
                this.highlightedNodeId = nodeDbId;
            }
        } catch (error) {
             console.error(`[Phaser Scene] Error during highlightNode for ${nodeDbId}:`, error);
        }
    }

    clearNodeHighlight(nodeDbId: number | null) {
        if (!this.nodes || !nodeDbId) return;
         try {
            const nodeToClear = this.nodes.getChildren().find(node => {
                return (node as Phaser.Physics.Arcade.Sprite).getData('nodeId') === nodeDbId;
            }) as Phaser.Physics.Arcade.Sprite | undefined;

            if (nodeToClear?.active && (nodeToClear.isTinted || nodeToClear.scale > 2)) {
                nodeToClear.clearTint();
                 const originalNodeScale = 2;
                 nodeToClear.setScale(originalNodeScale);
                if (this.highlightedNodeId === nodeDbId) {
                    this.highlightedNodeId = null;
                }
            }
         } catch (error) {
              console.error(`[Phaser Scene] Error during clearNodeHighlight for ${nodeDbId}:`, error);
         }
    }

    private updateAndEmitNodeCount() {
        if (!this.nodes || !this.onNodesCountUpdate) return;
        try {
            const count = this.nodes.countActive(true);
            this.onNodesCountUpdate(count);
        } catch (error) {
             console.error("[Phaser Scene] Error counting or emitting node count:", error);
        }
    }

    public setupNodes(nodesData: NodeData[]) {
        console.log(`[Phaser Scene] setupNodes called with ${nodesData.length} nodes.`);
        if (!this.nodes || !this.textures.exists('node')) return;

         try {
            this.nodes.clear(true, true);
         } catch (error) {
              console.error("[Phaser Scene] Error clearing existing nodes:", error);
         }

        const nodeScale = 2;

        nodesData.forEach((nodeInfo, index) => {
            // Use provided positions, or default to center if null/undefined
            const posX = nodeInfo.x ?? this.physics.world.bounds.width / 2;
            const posY = nodeInfo.y ?? this.physics.world.bounds.height / 2;

            try {
                const newNode = this.nodes?.create(posX, posY, 'node')
                                  .setData('nodeId', nodeInfo.nodeId) // Store numeric DB ID
                                  .setScale(nodeScale)
                                  .refreshBody();

                if (newNode?.anims) {
                     newNode.anims.play('node_active', true);
                }
            } catch(error) {
                 console.error(`[Phaser Scene] Error creating node ${nodeInfo.nodeId} in setupNodes:`, error);
            }
       });

       this.updateAndEmitNodeCount();
    }

    public zoomIn() {
        try {
            let newZoom = Phaser.Math.Clamp(this.cameras.main.zoom + this.zoomIncrement, this.minZoom, this.maxZoom);
            this.cameras.main.zoomTo(newZoom, 100);
        } catch(error){
             console.error("[Phaser Scene] Error during zoomIn:", error);
        }
    }

    public zoomOut() {
         try {
            let newZoom = Phaser.Math.Clamp(this.cameras.main.zoom - this.zoomIncrement, this.minZoom, this.maxZoom);
            this.cameras.main.zoomTo(newZoom, 100);
         } catch(error){
             console.error("[Phaser Scene] Error during zoomOut:", error);
         }
    }


  update(time: number, delta: number) {
    if (!this.playerInputEnabled) {
         if(this.player?.body?.velocity.x !== 0 || this.player?.body?.velocity.y !== 0) {
             this.player.setVelocity(0);
             const currentAnimKey = this.player.anims.currentAnim?.key;
             if (currentAnimKey?.startsWith('walk_')) {
                 this.player.anims.play(`idle_${currentAnimKey.split('_')[1]}`, true);
             }
         }
         return;
    }

    if (!this.player?.body || !this.player?.anims) return;

    try {
       this.player.setVelocity(0);
    } catch (error) {
        console.warn("[Phaser Update] Error resetting player velocity:", error);
        return;
    }

    let isMoving = false;
    let moveX = 0;
    let moveY = 0;

    const leftPressed = this.cursors?.left.isDown || this.wasdKeys?.A?.isDown;
    const rightPressed = this.cursors?.right.isDown || this.wasdKeys?.D?.isDown;
    const upPressed = this.cursors?.up.isDown || this.wasdKeys?.W?.isDown;
    const downPressed = this.cursors?.down.isDown || this.wasdKeys?.S?.isDown;

    if (leftPressed) moveX = -1;
    else if (rightPressed) moveX = 1;
    if (upPressed) moveY = -1;
    else if (downPressed) moveY = 1;

    if (moveX === 0 && moveY === 0 && (this.joystickDirection.x !== 0 || this.joystickDirection.y !== 0)) {
        moveX = this.joystickDirection.x;
        moveY = this.joystickDirection.y;
    }

    isMoving = moveX !== 0 || moveY !== 0;

    if (isMoving) {
        const moveVector = new Phaser.Math.Vector2(moveX, moveY).normalize();
        this.player.setVelocity(moveVector.x * this.playerSpeed, moveVector.y * this.playerSpeed);
        
        let facing = 'down';
        if (Math.abs(moveY) > Math.abs(moveX)) {
            facing = moveY < 0 ? 'up' : 'down';
        } else {
            facing = moveX < 0 ? 'left' : 'right';
        }
        this.player.anims.play(`walk_${facing}`, true);
    } else {
        const currentAnimKey = this.player.anims.currentAnim?.key;
        if (currentAnimKey?.startsWith('walk_')) {
            const facing = currentAnimKey.split('_')[1] || 'down';
            this.player.anims.play(`idle_${facing}`, true);
        }
    }
  }

  shutdown() {
      console.log("[Phaser Scene] Shutdown method called.");
      if (this.cooldownTimerEvent) this.cooldownTimerEvent.remove(false);
      this.scale?.off('resize', this.handleResize, this);
  }

  destroy() {
       console.log("[Phaser Scene] Destroy method called.");
       this.shutdown();
       super.destroy();
  }
}
