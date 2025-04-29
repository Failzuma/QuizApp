
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
  private disabledNodes: Set<string> = new Set(); // Keep track of disabled nodes
  private mapId?: string;
  private currentBackground?: Phaser.GameObjects.Image;
  private playerSpeed = 200; // Player movement speed
  private cameraZoomLevel = 1.5; // Initial zoom level, adjust as needed

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


  // Separate method for setting callback (used by React postBoot)
  // Deprecated in favor of initScene, but kept for potential fallback
  setInteractionCallback(callback: NodeInteractionCallback) {
    if (!this.onNodeInteract) { // Only set if not already set by initScene
        this.onNodeInteract = callback;
        console.warn("Interaction callback set via legacy setInteractionCallback.");
    }
  }

  preloadAssets() {
    // Preload assets common to all maps
    this.load.spritesheet('player', '/assets/images/player_placeholder_32.png', {
      frameWidth: 32,
      frameHeight: 32,
      endFrame: 127, // 16 columns * 8 rows = 128 frames (0-indexed)
    });

    this.load.spritesheet('node', '/assets/images/node_placeholder_16.png', {
      frameWidth: 16,
      frameHeight: 16,
      endFrame: 1, // 2 frames: 0 (closed), 1 (open/active)
    });

    // Preload map-specific backgrounds (adjust paths as needed)
    // Example: Use a naming convention like mapId_background.png
    if (this.mapId) {
        const backgroundAssetKey = `${this.mapId}_background`;
        this.load.image(backgroundAssetKey, `/assets/images/backgrounds/${this.mapId}_background.png`);
        console.log(`Preloading background: ${backgroundAssetKey}`);
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
        // Attempt to load defaults if mapId isn't set yet (might happen with legacy flow)
        this.mapId = 'default'; // Set a default to load something
    }

    this.preloadAssets();

     // Log errors if assets still fail to load
     this.load.on('loaderror', (file: Phaser.Loader.File) => {
         console.error(`Failed to process file: ${file.key} from ${file.url}`);
     });
     this.load.on('filecomplete', (key: string, type: string, data: any) => {
        // console.log(`Asset loaded: ${key}`); // Can be noisy, enable if needed
     });
     this.load.on('complete', () => {
        console.log("Asset loading complete.");
     });
  }

  createPlayerAnimations() {
      // Basic directional animations (adjust frame numbers based on your spritesheet layout)
      // Example: Assuming row 0 = down, row 1 = left, row 2 = right, row 3 = up
      // And each direction has, say, 4 frames for walking
      const frameRate = 10;

      // Idle frames (using the first frame of each direction for simplicity)
      this.anims.create({ key: 'idle_down', frames: [{ key: 'player', frame: 0 }], frameRate: 1 });
      this.anims.create({ key: 'idle_left', frames: [{ key: 'player', frame: 16 }], frameRate: 1 }); // Assuming 16 frames per row
      this.anims.create({ key: 'idle_right', frames: [{ key: 'player', frame: 32 }], frameRate: 1 });
      this.anims.create({ key: 'idle_up', frames: [{ key: 'player', frame: 48 }], frameRate: 1 });

      // Walking animations
      this.anims.create({
          key: 'walk_down',
          frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }), // Frames 0-3
          frameRate: frameRate,
          repeat: -1 // Loop forever
      });
      this.anims.create({
          key: 'walk_left',
          frames: this.anims.generateFrameNumbers('player', { start: 16, end: 19 }), // Frames 16-19
          frameRate: frameRate,
          repeat: -1
      });
       this.anims.create({
          key: 'walk_right',
          frames: this.anims.generateFrameNumbers('player', { start: 32, end: 35 }), // Frames 32-35
          frameRate: frameRate,
          repeat: -1
      });
      this.anims.create({
          key: 'walk_up',
          frames: this.anims.generateFrameNumbers('player', { start: 48, end: 51 }), // Frames 48-51
          frameRate: frameRate,
          repeat: -1
      });
      console.log("Player animations created.");
  }

   createNodeAnimations() {
       // Simple blinking/glowing effect for active nodes
       this.anims.create({
           key: 'node_active',
           frames: [
               { key: 'node', frame: 0 }, // Closed/dim
               { key: 'node', frame: 1 }, // Open/bright
           ],
           frameRate: 2, // Slow blink
           repeat: -1 // Loop forever
       });
       console.log("Node animations created.");
   }

  create() {
    console.log("MainScene create method started.");

    // --- Background ---
    const backgroundAssetKey = this.textures.exists(`${this.mapId}_background`)
        ? `${this.mapId}_background`
        : 'default_background'; // Fallback to default

    if (this.textures.exists(backgroundAssetKey)) {
        this.currentBackground = this.add.image(0, 0, backgroundAssetKey).setOrigin(0, 0);
        // Get background dimensions for world bounds
        const bgWidth = this.currentBackground.width;
        const bgHeight = this.currentBackground.height;
        this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
        this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
         console.log(`Set background ${backgroundAssetKey} and world bounds: ${bgWidth}x${bgHeight}`);
    } else {
         console.error(`Background texture '${backgroundAssetKey}' not loaded. Setting default color.`);
         this.cameras.main.setBackgroundColor('#E3F2FD'); // Fallback light blue
          // Set arbitrary world bounds if no background
         this.physics.world.setBounds(0, 0, 1600, 1200); // Example size
         this.cameras.main.setBounds(0, 0, 1600, 1200);
    }


    // --- Player ---
    if (!this.textures.exists('player')) {
         console.error("Player texture 'player' not loaded or available at create time.");
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
    this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player', 0); // Start facing down
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(this.player.width * 0.8, this.player.height * 0.8); // Adjust hitbox if needed
    this.createPlayerAnimations(); // Create animations


    // --- Nodes ---
    this.nodes = this.physics.add.staticGroup();
    if (!this.textures.exists('node')) {
      console.error("Node texture 'node' not loaded or available at create time.");
      return; // Don't create nodes if texture is missing
    }
    // Example node placement - adjust based on your map designs
    // Place nodes relative to the background size
    const node1X = this.physics.world.bounds.width * 0.3;
    const node1Y = this.physics.world.bounds.height * 0.4;
    const node2X = this.physics.world.bounds.width * 0.7;
    const node2Y = this.physics.world.bounds.height * 0.6;

    const node1 = this.nodes.create(node1X, node1Y, 'node').setData('nodeId', 'node_quiz1');
    const node2 = this.nodes.create(node2X, node2Y, 'node').setData('nodeId', 'node_quiz2');

    // Scale nodes visually (optional, keep pixel art crisp)
    const nodeScale = 2; // Make nodes appear larger
    node1.setScale(nodeScale);
    node2.setScale(nodeScale);


    this.createNodeAnimations();
    // Play animation on all active nodes initially
    this.nodes.children.iterate(child => {
        const node = child as Phaser.Physics.Arcade.Sprite;
        if (!this.disabledNodes.has(node.getData('nodeId'))) {
           node.anims.play('node_active', true);
        }
        // Refresh body AFTER scaling/animations might affect size/position
        node.refreshBody();
        return true;
    });


    // --- Physics and Input ---
    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);
    this.cursors = this.input.keyboard?.createCursorKeys();

    // --- Camera ---
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Make camera follow player smoothly
    this.cameras.main.setZoom(this.cameraZoomLevel); // Set initial zoom


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

     // Check if the node is already disabled or if the callback is missing
     if (!nodeId || !this.onNodeInteract || this.disabledNodes.has(nodeId)) {
       if(!this.onNodeInteract) console.error("Node overlap detected, but onNodeInteract callback is missing!");
       return;
     }

     console.log(`Player overlapped with node: ${nodeId}`);
     this.onNodeInteract(nodeId); // Call the callback function passed from React

     // Disable the node visually and physically
     spriteNode.disableBody(true, true); // Hides and disables physics
     spriteNode.setAlpha(0.3); // Make it visually distinct as disabled
     spriteNode.stop(); // Stop any running animation (like 'node_active')
     this.disabledNodes.add(nodeId); // Track disabled node
     console.log(`Node ${nodeId} disabled.`);
   }

   // Method called from React to re-enable a node
   reEnableNode(nodeId: string) {
     if (!this.nodes) return;

     const nodeToEnable = this.nodes.getChildren().find(node => {
       const spriteNode = node as Phaser.Physics.Arcade.Sprite;
       return spriteNode.getData('nodeId') === nodeId;
     }) as Phaser.Physics.Arcade.Sprite | undefined;

     if (nodeToEnable && this.disabledNodes.has(nodeId)) {
       // Re-enable body at its original position, make visible and interactive again
       nodeToEnable.enableBody(true, nodeToEnable.x, nodeToEnable.y, true, true);
       nodeToEnable.setAlpha(1); // Restore full visibility
       nodeToEnable.anims.play('node_active', true); // Restart animation
       this.disabledNodes.delete(nodeId); // Remove from disabled set
       console.log(`Node ${nodeId} re-enabled.`);
     } else if (!nodeToEnable) {
        console.warn(`Node with ID ${nodeId} not found to re-enable.`);
     } else {
        // Node exists but wasn't in the disabled set
        console.log(`Node ${nodeId} was already enabled.`);
     }
   }


  update(time: number, delta: number) {
    if (!this.cursors || !this.player || !(this.player instanceof Phaser.Physics.Arcade.Sprite)) {
      return;
    }

    // Reset velocity and animation state
    this.player.setVelocity(0);
    let currentAnim = this.player.anims.currentAnim;
    let currentKey = currentAnim ? currentAnim.key : null;
    let isMoving = false;

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-this.playerSpeed);
      this.player.anims.play('walk_left', true);
      isMoving = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(this.playerSpeed);
       this.player.anims.play('walk_right', true);
      isMoving = true;
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-this.playerSpeed);
      // Prioritize horizontal animation if moving diagonally
      if (!isMoving) this.player.anims.play('walk_up', true);
      isMoving = true;
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(this.playerSpeed);
      // Prioritize horizontal animation if moving diagonally
      if (!isMoving) this.player.anims.play('walk_down', true);
      isMoving = true;
    }

     // Normalize and scale the velocity so that player doesn't move faster diagonally
     const velocity = this.player.body?.velocity;
     if (velocity && (velocity.x !== 0 || velocity.y !== 0)) {
         const currentSpeed = velocity.length(); // Use vector length
         if (currentSpeed > this.playerSpeed) {
            // Scale velocity vector to the desired speed
             velocity.normalize().scale(this.playerSpeed);
         }
     }

    // Set idle animation if not moving
    if (!isMoving && currentKey && currentKey.startsWith('walk_')) {
        // Determine idle direction based on last walking animation
        const idleKey = currentKey.replace('walk_', 'idle_');
        this.player.anims.play(idleKey, true);
    } else if (!isMoving && !currentKey?.startsWith('idle_')) {
        // Default idle state if no previous walk animation was playing (e.g., on load)
        this.player.anims.play('idle_down', true);
    }

    // --- Optional: Smooth Camera Resizing ---
    // If you want the camera to smoothly adjust zoom or position on window resize
    // You might need to handle resize events here or in the Phaser config scale settings
  }
}

