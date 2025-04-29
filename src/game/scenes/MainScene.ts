
import * as Phaser from 'phaser';

// Define the types for the interaction callback
export type NodeInteractionCallback = (nodeId: string) => void;

// Define the type for initialization data
export interface SceneInitData {
  mapId: string;
}

export default class MainScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  private onNodeInteract!: NodeInteractionCallback; // Should be set in initScene
  // private disabledNodes: Set<string> = new Set(); // Keep track of disabled nodes -> No longer needed, nodes are removed
  private mapId?: string;
  private currentBackground?: Phaser.GameObjects.Image;
  private playerSpeed = 200; // Player movement speed
  private initialCameraZoomLevel = 1.5; // Initial zoom level
  private minZoom = 0.5; // Minimum zoom level
  private maxZoom = 3; // Maximum zoom level
  private zoomIncrement = 0.1; // How much to zoom per step
  private playerScale = 1.5; // Make player larger

  constructor() {
    super({ key: 'MainScene' });
  }

  // Method to receive initialization data and the callback
  initScene(data: SceneInitData, callback: NodeInteractionCallback) {
    this.mapId = data.mapId;
    this.onNodeInteract = callback;
    console.log(`MainScene initialized for map: ${this.mapId} with callback.`);

    // Safety check
    if (!this.onNodeInteract) {
        console.error("MainScene initScene called without a valid onNodeInteract callback!");
        // Provide a default fallback or throw an error
        this.onNodeInteract = (nodeId) => console.warn(`Default onNodeInteract called for node: ${nodeId}`);
    }
  }


  // // Separate method for setting callback (used by React postBoot)
  // // Deprecated in favor of initScene, but kept for potential fallback
  // setInteractionCallback(callback: NodeInteractionCallback) {
  //   if (!this.onNodeInteract) { // Only set if not already set by initScene
  //       this.onNodeInteract = callback;
  //       console.warn("Interaction callback set via legacy setInteractionCallback.");
  //   }
  // }

  preloadAssets() {
    // Preload assets common to all maps
    // Player spritesheet: 512x256, 32x32 frames (16 columns x 8 rows = 128 frames, 0-127)
    this.load.spritesheet('player', '/assets/images/player_placeholder_32.png', {
      frameWidth: 32,
      frameHeight: 32,
      endFrame: 127, // Corrected endFrame based on 16x8 grid
    });

    // Node spritesheet: 32x16, 16x16 frames (2 frames: 0-1)
    this.load.spritesheet('node', '/assets/images/node_placeholder_16.png', {
      frameWidth: 16,
      frameHeight: 16,
      endFrame: 1, // Correct endFrame (0 and 1)
    });

    // Preload map-specific backgrounds
    if (this.mapId) {
        const backgroundAssetKey = `${this.mapId}_background`;
        // Assuming backgrounds are in public/assets/images/backgrounds/
        // Provide distinct URLs for different map IDs
        let backgroundUrl = `/assets/images/backgrounds/default_background.png`; // Default
        if (this.mapId === 'map1') {
            backgroundUrl = `/assets/images/backgrounds/map1_background.png`;
        } else if (this.mapId === 'map2') {
            backgroundUrl = `/assets/images/backgrounds/map2_background.png`;
        } // Add more else if blocks for other map IDs
        // Fallback for other maps if not explicitly defined
        else if (this.mapId === 'map3') {
           backgroundUrl = `/assets/images/backgrounds/map3_background.png`; // Example
        }

        // Only load if the specific file exists or use a default
        this.load.image(backgroundAssetKey, backgroundUrl);
        console.log(`Attempting to preload background: ${backgroundAssetKey} from ${backgroundUrl}`);

        // Error handling for image loading
        this.load.once(`fileerror-image-${backgroundAssetKey}`, (file: Phaser.Loader.File) => {
            console.error(`Failed to load background image: ${file.key} from ${file.url}. Loading default.`);
            if (backgroundAssetKey !== 'default_background') {
                this.load.image('default_background', '/assets/images/backgrounds/default_background.png');
            }
        });
    } else {
        // Load a default background if mapId is somehow missing
        this.load.image('default_background', '/assets/images/backgrounds/default_background.png');
        console.warn("mapId missing during preload, loading default background.");
    }
  }

  preload() {
    console.log("MainScene preload started.");
    if (!this.mapId) {
        console.error("Cannot preload assets without mapId. Ensure initScene is called before preload.");
        this.mapId = 'default'; // Set a default to try loading *something*
    }

    this.preloadAssets();

     // Log general load errors
     this.load.on('loaderror', (file: Phaser.Loader.File) => {
         console.error(`Failed to process file: ${file.key} from ${file.url}. Error type: ${file.xhrLoader?.statusText}`);
     });
     this.load.on('filecomplete', (key: string, type: string, data: any) => {
        // console.log(`Asset loaded: ${key}`); // Can be noisy, enable if needed
     });
     this.load.on('complete', () => {
        console.log("Asset loading complete.");
     });
  }

  createPlayerAnimations() {
      // Define frame ranges based on the 16x8 grid (32x32 frames)
      // Row 0: Down (Frames 0-15)
      // Row 1: Left (Frames 16-31)
      // Row 2: Right (Frames 32-47)
      // Row 3: Up (Frames 48-63)
      // (Assuming first few frames of each row are walk, and first frame is idle)
      const frameRate = 10;
      const walkFrames = 4; // Number of frames for walk animation

      // Idle frames (using the first frame of each direction row)
      this.anims.create({ key: 'idle_down', frames: [{ key: 'player', frame: 0 }], frameRate: 1 });
      this.anims.create({ key: 'idle_left', frames: [{ key: 'player', frame: 16 }], frameRate: 1 });
      this.anims.create({ key: 'idle_right', frames: [{ key: 'player', frame: 32 }], frameRate: 1 });
      this.anims.create({ key: 'idle_up', frames: [{ key: 'player', frame: 48 }], frameRate: 1 });

      // Walking animations
      this.anims.create({
          key: 'walk_down',
          frames: this.anims.generateFrameNumbers('player', { start: 1, end: walkFrames }), // Frames 1-4
          frameRate: frameRate,
          repeat: -1 // Loop forever
      });
      this.anims.create({
          key: 'walk_left',
          frames: this.anims.generateFrameNumbers('player', { start: 17, end: 16 + walkFrames }), // Frames 17-20
          frameRate: frameRate,
          repeat: -1
      });
       this.anims.create({
          key: 'walk_right',
          frames: this.anims.generateFrameNumbers('player', { start: 33, end: 32 + walkFrames }), // Frames 33-36
          frameRate: frameRate,
          repeat: -1
      });
      this.anims.create({
          key: 'walk_up',
          frames: this.anims.generateFrameNumbers('player', { start: 49, end: 48 + walkFrames }), // Frames 49-52
          frameRate: frameRate,
          repeat: -1
      });
      console.log("Player animations created.");
  }

   createNodeAnimations() {
       // Node animation: closed (frame 0) to open (frame 1) and back
       this.anims.create({
           key: 'node_active',
           frames: [
               { key: 'node', frame: 0 }, // Closed/dim
               { key: 'node', frame: 1 }, // Open/bright
           ],
           frameRate: 2, // Slow blink/pulse
           repeat: -1, // Loop forever
           yoyo: true // Automatically reverses the animation
       });
       console.log("Node animations created.");
   }

  create() {
    console.log("MainScene create method started.");

    // --- Background ---
    // Determine the correct background key, falling back to default if necessary
    let backgroundAssetKey = `default_background`;
    if (this.mapId && this.textures.exists(`${this.mapId}_background`)) {
        backgroundAssetKey = `${this.mapId}_background`;
    } else if (this.mapId && !this.textures.exists(`${this.mapId}_background`) && this.textures.exists('default_background')) {
        console.warn(`Map-specific background '${this.mapId}_background' not found, using default.`);
        backgroundAssetKey = 'default_background';
    } else if (!this.textures.exists('default_background')) {
        // Critical error if even default background is missing
        console.error("Default background texture 'default_background' not loaded. Check path/network.");
        this.cameras.main.setBackgroundColor('#E3F2FD'); // Fallback color
        // Set arbitrary world bounds
        const defaultWidth = 1600;
        const defaultHeight = 1200;
        this.physics.world.setBounds(0, 0, defaultWidth, defaultHeight);
        this.cameras.main.setBounds(0, 0, defaultWidth, defaultHeight);
        console.warn(`Using fallback background color and bounds: ${defaultWidth}x${defaultHeight}`);
    }

    // Add the background image if the key is valid
    if (this.textures.exists(backgroundAssetKey)) {
        this.currentBackground = this.add.image(0, 0, backgroundAssetKey).setOrigin(0, 0);
        const bgWidth = this.currentBackground.width;
        const bgHeight = this.currentBackground.height;
        this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
        this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
        console.log(`Set background ${backgroundAssetKey} and world bounds: ${bgWidth}x${bgHeight}`);
    } else {
        // This block should ideally not be reached if the logic above is correct,
        // but serves as a final fallback.
        console.error(`Background texture '${backgroundAssetKey}' could not be set. Fallback to color.`);
        this.cameras.main.setBackgroundColor('#E3F2FD');
        const defaultWidth = 1600; const defaultHeight = 1200;
        this.physics.world.setBounds(0, 0, defaultWidth, defaultHeight);
        this.cameras.main.setBounds(0, 0, defaultWidth, defaultHeight);
    }

    // --- Player ---
    // Ensure player texture exists before creating sprite
    if (!this.textures.exists('player')) {
         console.error("Player texture 'player' not loaded or available at create time. Check preload path and network issues.");
          // Optionally add a visual placeholder if texture fails
          const placeholder = this.add.graphics();
          placeholder.fillStyle(0x1A237E, 1); // Dark blue
          // Position relative to potential world center if known, else arbitrary
          const worldCenterX = this.physics.world.bounds.width / 2;
          const worldCenterY = this.physics.world.bounds.height / 2;
          placeholder.fillRect(worldCenterX - 16, worldCenterY - 16, 32, 32);
          return; // Stop creation if essential asset is missing
    }

    // Position player near the center of the world/background
    const playerStartX = this.physics.world.bounds.width / 2;
    const playerStartY = this.physics.world.bounds.height / 2;
    this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player', 0); // Start facing down (frame 0)
    this.player.setScale(this.playerScale); // Make player larger
    this.player.setCollideWorldBounds(true);
    // Adjust hitbox relative to the scaled size if needed, e.g., smaller than visual bounds
    this.player.setBodySize(this.player.width * 0.7, this.player.height * 0.8); // Adjusted for scaled size
    this.player.body?.setOffset(this.player.width * 0.15, this.player.height * 0.1); // Center offset if needed


    this.createPlayerAnimations(); // Create animations


    // --- Nodes ---
    this.nodes = this.physics.add.staticGroup();
    if (!this.textures.exists('node')) {
      console.error("Node texture 'node' not loaded or available at create time.");
      // Don't stop execution, but nodes won't appear
    } else {
        // Example node placement - adjust based on your map designs
        const node1X = this.physics.world.bounds.width * 0.3;
        const node1Y = this.physics.world.bounds.height * 0.4;
        const node2X = this.physics.world.bounds.width * 0.7;
        const node2Y = this.physics.world.bounds.height * 0.6;

        const node1 = this.nodes.create(node1X, node1Y, 'node').setData('nodeId', 'node_quiz1');
        const node2 = this.nodes.create(node2X, node2Y, 'node').setData('nodeId', 'node_quiz2');

        // Scale nodes visually
        const nodeScale = 2; // Make nodes appear larger
        this.nodes.children.iterate(child => {
            const node = child as Phaser.Physics.Arcade.Sprite;
            node.setScale(nodeScale);
            // Refresh body AFTER scaling to ensure physics body matches visual size
            node.refreshBody();
            return true;
        });

        this.createNodeAnimations();
        // Play animation on all active nodes initially
        this.nodes.children.iterate(child => {
            const node = child as Phaser.Physics.Arcade.Sprite;
           // if (!this.disabledNodes.has(node.getData('nodeId'))) { // No longer needed
               node.anims.play('node_active', true);
           // }
            return true;
        });
    }


    // --- Physics and Input ---
    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);
    this.cursors = this.input.keyboard?.createCursorKeys();

    // --- Camera ---
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // Smoother follow
    this.cameras.main.setZoom(this.initialCameraZoomLevel); // Set initial zoom

    // --- Zoom Controls ---
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
        let newZoom;
        if (deltaY > 0) {
            // Zoom out
            newZoom = this.cameras.main.zoom - this.zoomIncrement;
        } else {
            // Zoom in
            newZoom = this.cameras.main.zoom + this.zoomIncrement;
        }
        // Clamp zoom level
        newZoom = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom);
        this.cameras.main.zoomTo(newZoom, 100); // Smooth zoom over 100ms
    });


     // Check if the callback was set correctly
     if (!this.onNodeInteract) {
        console.error("CRITICAL: onNodeInteract callback is NOT set in create() after initialization!");
     }
     console.log("MainScene create method finished.");
  }

   handleNodeOverlap(player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
                     node: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile)
   {
     // Type guard to ensure node is a sprite with data
     if (!(node instanceof Phaser.Physics.Arcade.Sprite)) {
       return;
     }

     const spriteNode = node as Phaser.Physics.Arcade.Sprite;
     const nodeId = spriteNode.getData('nodeId') as string;

     // Check if the callback is missing
     if (!nodeId || !this.onNodeInteract) {
       if(!this.onNodeInteract) console.error("Node overlap detected, but onNodeInteract callback is missing!");
       return;
     }

     console.log(`Player overlapped with node: ${nodeId}`);

     // Important: Disable the node's body *immediately* to prevent multiple triggers
     // while the React quiz is open. We'll remove it fully later via removeNode.
     spriteNode.disableBody(false, false); // Disable physics but keep visible initially

     this.onNodeInteract(nodeId); // Call the callback function passed from React to show the quiz

     // The node is now visually present but non-interactive.
     // It will be fully removed by the removeNode function called from React after the quiz.
   }

   // Method called from React to completely remove a node after it's answered
   removeNode(nodeId: string) {
     if (!this.nodes) return;

     const nodeToRemove = this.nodes.getChildren().find(node => {
       const spriteNode = node as Phaser.Physics.Arcade.Sprite;
       return spriteNode.getData('nodeId') === nodeId;
     }) as Phaser.Physics.Arcade.Sprite | undefined;

     if (nodeToRemove) {
       console.log(`Removing node: ${nodeId}`);
       nodeToRemove.destroy(); // Remove the node from the scene and the group
       // No need to manage a disabled set anymore
     } else {
        console.warn(`Node with ID ${nodeId} not found to remove.`);
     }
   }


  update(time: number, delta: number) {
    if (!this.cursors || !this.player || !(this.player instanceof Phaser.Physics.Arcade.Sprite) || !this.player.body) {
      return;
    }

    // Reset velocity
    this.player.setVelocity(0);
    let currentAnimKey = this.player.anims.currentAnim?.key;
    let isMoving = false;
    let facing = currentAnimKey?.replace('walk_', '').replace('idle_', '') || 'down'; // Track direction

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-this.playerSpeed);
      facing = 'left';
      isMoving = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(this.playerSpeed);
      facing = 'right';
      isMoving = true;
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-this.playerSpeed);
      // Only update facing if not moving horizontally
      if (!isMoving) facing = 'up';
      isMoving = true;
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(this.playerSpeed);
       // Only update facing if not moving horizontally
      if (!isMoving) facing = 'down';
      isMoving = true;
    }

     // Normalize and scale the velocity so that player doesn't move faster diagonally
     const velocity = this.player.body.velocity;
     if (velocity.x !== 0 || velocity.y !== 0) {
         velocity.normalize().scale(this.playerSpeed);
     }

    // Play animations based on movement and facing direction
    if (isMoving) {
        const walkAnimKey = `walk_${facing}`;
        if (currentAnimKey !== walkAnimKey) {
            this.player.anims.play(walkAnimKey, true);
        }
    } else {
        const idleAnimKey = `idle_${facing}`;
         if (currentAnimKey !== idleAnimKey) {
             this.player.anims.play(idleAnimKey, true);
         }
    }

    // --- Smooth Camera Resizing (Example - place in resize handler if needed) ---
    // const scaleManager = this.scale;
    // scaleManager.on('resize', (gameSize: Phaser.Structs.Size) => {
    //    // Optional: Adjust camera bounds or zoom based on new size
    //    this.cameras.main.setBounds(0, 0, this.physics.world.bounds.width, this.physics.world.bounds.height);
    //    // Maybe adjust zoom based on aspect ratio or size?
    // });
  }
}
