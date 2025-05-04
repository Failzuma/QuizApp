
import * as Phaser from 'phaser';
import type { JoystickManager, JoystickOutputData } from 'nipplejs'; // Import types for joystick data

// Define the types for the interaction callback
export type NodeInteractionCallback = (nodeId: string) => void;
// Define the type for the nodes count callback
export type NodesCountCallback = (count: number) => void;


// Define the type for initialization data passed from React
export interface SceneInitData {
  mapId: string;
}

// Define the structure for node data passed from React
export interface NodeData {
    nodeId: string;
    x?: number; // Optional initial position X
    y?: number; // Optional initial position Y
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
  private minZoom = 0.5; // Minimum zoom level
  private maxZoom = 3; // Maximum zoom level
  private zoomIncrement = 0.1; // How much to zoom per step (mouse wheel or button)
  // private pinchZoomFactor = 0.005; // Sensitivity for pinch zoom - REMOVED
  private playerScale = 2.0; // Make player larger
  private playerInputEnabled = true; // Flag to control player movement input
  private interactionOnCooldown = false; // Flag to manage node interaction cooldown
  private cooldownTimerEvent?: Phaser.Time.TimerEvent; // Timer event for cooldown
  private joystickDirection: { x: number; y: number } = { x: 0, y: 0 }; // Store joystick vector
  private highlightedNodeId: string | null = null; // Track the currently highlighted node
  private nodeCreationData: NodeData[] = []; // Store node data received from React
  // private initialPinchDistance: number | null = null; // For pinch-to-zoom - REMOVED


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

    // Safety check for interaction callback
    if (!this.onNodeInteract) {
        console.error("[Phaser Scene] initScene called without a valid onNodeInteract callback!");
        this.onNodeInteract = (nodeId) => console.warn(`[Phaser Scene] Default onNodeInteract called for node: ${nodeId}`);
    }
    // Safety check for count callback
    if (!this.onNodesCountUpdate) {
        console.error("[Phaser Scene] initScene called without a valid onNodesCountUpdate callback!");
        this.onNodesCountUpdate = (count) => console.warn(`[Phaser Scene] Default onNodesCountUpdate called with count: ${count}`);
    }
}


  preloadAssets() {
    // Preload assets common to all maps
    console.log("[Phaser Scene] Preloading common assets...");
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
        console.log(`[Phaser Scene] Attempting to preload background: ${backgroundAssetKey} from ${backgroundUrl}`);
        // Only load if the specific file exists or use a default
        this.load.image(backgroundAssetKey, backgroundUrl);


        // Error handling for image loading
        this.load.once(`fileerror-image-${backgroundAssetKey}`, (file: Phaser.Loader.File) => {
            console.error(`[Phaser Scene] Failed to load background image: ${file.key} from ${file.url}. Loading default.`);
            if (backgroundAssetKey !== 'default_background' && !this.textures.exists('default_background')) {
                this.load.image('default_background', '/assets/images/backgrounds/default_background.png');
            }
        });
    } else {
        // Load a default background if mapId is somehow missing
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
        this.mapId = 'default'; // Set a default to try loading *something*
    }

    this.preloadAssets();

     // Log general load errors
     this.load.on('loaderror', (file: Phaser.Loader.File) => {
         console.error(`[Phaser Scene Load Error] Failed to load file: ${file.key} from ${file.url}. Error type: ${file.type}, Status: ${file.xhrLoader?.status} ${file.xhrLoader?.statusText}`);
     });
     this.load.on('filecomplete', (key: string, type: string, data: any) => {
        // console.log(`Asset loaded: ${key}`); // Can be noisy, enable if needed
     });
     this.load.on('complete', () => {
        console.log("[Phaser Scene] Asset loading complete.");
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
      console.log("[Phaser Scene] Player animations created.");
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
       console.log("[Phaser Scene] Node animations created.");
   }

  create() {
    console.log("[Phaser Scene] MainScene create method started.");

    // --- Background ---
    // Determine the correct background key, falling back to default if necessary
    let backgroundAssetKey = `default_background`;
    if (this.mapId && this.textures.exists(`${this.mapId}_background`)) {
        backgroundAssetKey = `${this.mapId}_background`;
    } else if (this.mapId && !this.textures.exists(`${this.mapId}_background`) && this.textures.exists('default_background')) {
        console.warn(`[Phaser Scene] Map-specific background '${this.mapId}_background' not found, using default.`);
        backgroundAssetKey = 'default_background';
    } else if (!this.textures.exists('default_background')) {
        // Critical error if even default background is missing
        console.error("[Phaser Scene] Default background texture 'default_background' not loaded. Check path/network.");
        this.cameras.main.setBackgroundColor('#E3F2FD'); // Fallback color
        // Set arbitrary world bounds
        const defaultWidth = 1600;
        const defaultHeight = 1200;
        this.physics.world.setBounds(0, 0, defaultWidth, defaultHeight);
        this.cameras.main.setBounds(0, 0, defaultWidth, defaultHeight);
        console.warn(`[Phaser Scene] Using fallback background color and bounds: ${defaultWidth}x${defaultHeight}`);
    }

    // Add the background image if the key is valid
    if (this.textures.exists(backgroundAssetKey)) {
        this.currentBackground = this.add.image(0, 0, backgroundAssetKey).setOrigin(0, 0);
        const bgWidth = this.currentBackground.width;
        const bgHeight = this.currentBackground.height;
        this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
        this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);

        // Calculate minZoom based on background size and game canvas size
        // Prevent zooming out further than the background boundaries
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        this.minZoom = Math.max(gameWidth / bgWidth, gameHeight / bgHeight, 0.1); // Ensure minZoom is at least 0.1
        this.minZoom = Phaser.Math.Clamp(this.minZoom, 0.1, 1); // Clamp between 0.1 and 1

        console.log(`[Phaser Scene] Set background ${backgroundAssetKey} and world bounds: ${bgWidth}x${bgHeight}. Min zoom calculated: ${this.minZoom}`);
    } else {
        // This block should ideally not be reached if the logic above is correct,
        // but serves as a final fallback.
        console.error(`[Phaser Scene] Background texture '${backgroundAssetKey}' could not be set. Fallback to color.`);
        this.cameras.main.setBackgroundColor('#E3F2FD');
        const defaultWidth = 1600; const defaultHeight = 1200;
        this.physics.world.setBounds(0, 0, defaultWidth, defaultHeight);
        this.cameras.main.setBounds(0, 0, defaultWidth, defaultHeight);
        this.minZoom = 0.5; // Use default min zoom if background failed
    }

    // --- Player ---
    // Ensure player texture exists before creating sprite
    if (!this.textures.exists('player')) {
         console.error("[Phaser Scene] Player texture 'player' not loaded or available at create time. Check preload path and network issues.");
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
    // Note: Body size is in original pixels *before* scale. Adjust offset accordingly.
    const hitboxWidth = this.player.width * 0.7;
    const hitboxHeight = this.player.height * 0.8;
    this.player.setBodySize(hitboxWidth, hitboxHeight);
    // Offset is also relative to original size. Center it based on the new hitbox size.
    const offsetX = (this.player.width - hitboxWidth) / 2;
    const offsetY = (this.player.height - hitboxHeight) / 2 + (this.player.height * 0.1); // Adjust Y offset slightly down
    this.player.setOffset(offsetX, offsetY);


    this.createPlayerAnimations(); // Create animations


    // --- Nodes ---
    this.nodes = this.physics.add.staticGroup();
    if (!this.textures.exists('node')) {
      console.error("[Phaser Scene] Node texture 'node' not loaded or available at create time.");
      // Don't stop execution, but nodes won't appear
    } else {
        console.log("[Phaser Scene] Creating nodes based on nodeCreationData...");
        const nodeScale = 2; // Make nodes appear larger

        // Use the data passed from React via initScene
        this.nodeCreationData.forEach((nodeInfo, index) => {
             // Determine position: use provided coords or distribute if missing
             // Simple distribution example (replace with actual layout logic)
             const posX = nodeInfo.x ?? this.physics.world.bounds.width * (0.2 + (index * 0.15) % 0.6);
             const posY = nodeInfo.y ?? this.physics.world.bounds.height * (0.3 + Math.floor(index / 4) * 0.2);

             console.log(`[Phaser Scene] Creating node ${nodeInfo.nodeId} at (${posX.toFixed(0)}, ${posY.toFixed(0)})`);
             const newNode = this.nodes?.create(posX, posY, 'node')
                                .setData('nodeId', nodeInfo.nodeId)
                                .setScale(nodeScale)
                                .refreshBody(); // Refresh body after scaling

             if (!newNode) {
                 console.error(`[Phaser Scene] Failed to create node ${nodeInfo.nodeId}`);
             }
        });

        this.createNodeAnimations();
        // Play animation on all active nodes initially
        this.nodes.children.iterate(child => {
            const node = child as Phaser.Physics.Arcade.Sprite;
            node.anims.play('node_active', true);
            return true;
        });
        // Initial node count update
        this.updateAndEmitNodeCount();
        console.log(`[Phaser Scene] Initial node count: ${this.nodes.countActive(true)}`);
    }


    // --- Physics and Input ---
    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);

    // Setup keyboard input listeners
    if (this.input.keyboard) {
        console.log("[Phaser Scene] Setting up keyboard input...");
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };

        // Stop propagation for keys used by player movement IF THEY CONFLICT with UI
        // Example: Stop spacebar propagation ONLY when keyboard input is disabled (quiz active)
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', (event: KeyboardEvent) => {
             if (!this.playerInputEnabled) { // Only interfere when UI is active
                 // console.log("[Input] Preventing Space propagation.");
                 event.stopPropagation();
             }
        });
        // Consider doing the same for W, A, S, D if needed, but test carefully
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
         // Add for Arrow Keys as well if they cause issues
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
         this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT).on('down', (event: KeyboardEvent) => { if (!this.playerInputEnabled) event.stopPropagation(); });
    }


    // --- Camera ---
    console.log("[Phaser Scene] Setting up camera...");
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // Smoother follow
    // Set initial zoom, clamped by the calculated minZoom
    const clampedInitialZoom = Phaser.Math.Clamp(this.initialCameraZoomLevel, this.minZoom, this.maxZoom);
    this.cameras.main.setZoom(clampedInitialZoom);
     console.log(`[Phaser Scene] Initial camera zoom set to: ${clampedInitialZoom}`);

    // --- Zoom Controls ---
    // Mouse Wheel Zoom
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
        let newZoom;
        if (deltaY > 0) {
            // Zoom out
            newZoom = this.cameras.main.zoom - this.zoomIncrement;
        } else {
            // Zoom in
            newZoom = this.cameras.main.zoom + this.zoomIncrement;
        }
        // Clamp zoom level using the dynamically calculated minZoom
        newZoom = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom);
        this.cameras.main.zoomTo(newZoom, 100); // Smooth zoom over 100ms
         // console.log(`Zoom changed to: ${newZoom}`);
    });

    // --- Pinch-to-Zoom (REMOVED) ---
    /*
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        // Check if pointer1 and pointer2 exist and are down
        if (this.input.pointer1?.isDown && this.input.pointer2?.isDown) {
            this.initialPinchDistance = Phaser.Math.Distance.Between(
                this.input.pointer1.x, this.input.pointer1.y,
                this.input.pointer2.x, this.input.pointer2.y
            );
            // console.log("[Pinch] Start detected, initial distance:", this.initialPinchDistance);
        } else {
             this.initialPinchDistance = null; // Reset if only one pointer down initially or pointers are undefined
        }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
         // Only process pinch zoom if two pointers are down and we have an initial distance
        // Ensure pointer1 and pointer2 exist
        if (this.input.pointer1?.isDown && this.input.pointer2?.isDown && this.initialPinchDistance !== null) {
            const currentDistance = Phaser.Math.Distance.Between(
                this.input.pointer1.x, this.input.pointer1.y,
                this.input.pointer2.x, this.input.pointer2.y
            );
            const deltaDistance = currentDistance - this.initialPinchDistance;

             // Calculate zoom change based on the distance delta and sensitivity
            let zoomChange = deltaDistance * this.pinchZoomFactor;
            let newZoom = this.cameras.main.zoom + zoomChange;

             // Clamp the new zoom level
            newZoom = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom);

            // Apply the zoom gradually for smoothness (optional, can set directly)
            // this.cameras.main.zoomTo(newZoom, 50); // Zoom over 50ms
            this.cameras.main.setZoom(newZoom); // Set directly for immediate feedback

             // Update the initial distance for the next move event to make zoom continuous
            this.initialPinchDistance = currentDistance;
            // console.log("[Pinch] Move detected. New distance:", currentDistance, "New Zoom:", newZoom);
        }
    });

    // Reset pinch distance when pointers are released
     this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          // Use input.pointerTotal to check active pointers reliably
          if (this.input.pointerTotal < 2) {
               if (this.initialPinchDistance !== null) {
                    // console.log("[Pinch] End detected.");
                    this.initialPinchDistance = null;
               }
          }
     });
     */


     // Check if the callbacks were set correctly
     if (!this.onNodeInteract) {
        console.error("[Phaser Scene] CRITICAL: onNodeInteract callback is NOT set in create() after initialization!");
     }
     if (!this.onNodesCountUpdate) {
        console.error("[Phaser Scene] CRITICAL: onNodesCountUpdate callback is NOT set in create() after initialization!");
     }
     console.log("[Phaser Scene] MainScene create method finished.");
  }

   handleNodeOverlap(player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
                     node: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile)
   {
     // Type guard to ensure node is a sprite with data and body
     if (!(node instanceof Phaser.Physics.Arcade.Sprite) || !node.body) {
       // console.log("[Overlap] Ignored non-sprite overlap");
       return;
     }

     // Check if interaction is currently on cooldown
     if (this.interactionOnCooldown) {
          // console.log("[Overlap] Interaction on cooldown, ignoring overlap."); // Can be noisy
         return;
     }

     // Check if the node's body is already disabled (prevent rapid re-triggering)
     if (!node.body.enable) {
          // console.log("[Overlap] Node body already disabled, ignoring overlap.");
         return;
     }

     const spriteNode = node as Phaser.Physics.Arcade.Sprite;
     const nodeId = spriteNode.getData('nodeId') as string;

     // Check if the callback is missing or nodeId is invalid
     if (!nodeId || !this.onNodeInteract) {
       if(!this.onNodeInteract) console.error("[Overlap] Node overlap detected, but onNodeInteract callback is missing!");
       if(!nodeId) console.error("[Overlap] Overlapped node is missing 'nodeId' data!");
       return;
     }

     console.log(`[Overlap] Player overlapped with node: ${nodeId}`);

     // Important: Disable the node's body *immediately* to prevent multiple triggers
     // while the React quiz is open. Keep it visible.
     console.log(`[Overlap] Disabling physics body for node: ${nodeId}`);
     spriteNode.disableBody(false, false); // Disable physics but keep visible

     // Trigger the interaction callback to React
     this.onNodeInteract(nodeId);

     // Highlight the node visually
     this.highlightNode(nodeId);

     // The node is now visually present but non-interactive.
     // It will be fully removed by the removeNode function (after quiz answer)
     // or re-enabled by reEnableNode (if quiz closed without answering).
   }

   // Method called from React to completely remove a node after it's answered (correctly OR incorrectly)
   removeNode(nodeId: string) {
     console.log(`[Phaser Scene] Attempting to remove node: ${nodeId}`);
     if (!this.nodes) {
         console.error("[Phaser Scene] Cannot remove node: nodes group is null.");
         return;
     }

     this.clearNodeHighlight(nodeId); // Ensure highlight is cleared before removing

     const nodeToRemove = this.nodes.getChildren().find(node => {
       const spriteNode = node as Phaser.Physics.Arcade.Sprite;
       return spriteNode.getData('nodeId') === nodeId;
     }) as Phaser.Physics.Arcade.Sprite | undefined;

     if (nodeToRemove) {
        // Double-check if the node still exists and hasn't been destroyed already
        if (nodeToRemove.active) {
             console.log(`[Phaser Scene] Found active node ${nodeId}. Destroying...`);
             nodeToRemove.destroy(); // Remove the node from the scene and the group
             this.updateAndEmitNodeCount(); // Update count after removing
             console.log(`[Phaser Scene] Node ${nodeId} destroyed. New count: ${this.nodes.countActive(true)}`);
        } else {
            console.warn(`[Phaser Scene] Node ${nodeId} found but was already inactive/destroyed. Skipping removal.`);
            // Make sure to update count even if node was already inactive, as React relies on this
            this.updateAndEmitNodeCount();
        }
     } else {
        console.warn(`[Phaser Scene] Node with ID ${nodeId} not found to remove.`);
     }
   }

   // Method called from React to re-enable a node if quiz is closed without answering
   reEnableNode(nodeId: string) {
        console.log(`[Phaser Scene] Attempting to re-enable node: ${nodeId}`);
       if (!this.nodes) {
            console.error("[Phaser Scene] Cannot re-enable node: nodes group is null.");
            return;
       };

        this.clearNodeHighlight(nodeId); // Ensure highlight is cleared

       const nodeToReEnable = this.nodes.getChildren().find(node => {
           const spriteNode = node as Phaser.Physics.Arcade.Sprite;
           // Find node by ID, even if it was disabled (but not destroyed)
           return spriteNode.getData('nodeId') === nodeId;
       }) as Phaser.Physics.Arcade.Sprite | undefined;

       if (nodeToReEnable) {
           // Only re-enable if the node actually still exists (hasn't been destroyed by removeNode)
           if (nodeToReEnable.active) {
               // Check if body *needs* re-enabling
               if(!nodeToReEnable.body?.enable){
                    console.log(`[Phaser Scene] Re-enabling physics body for node: ${nodeId}`);
                    nodeToReEnable.enableBody(false, 0, 0, true, true); // Re-enable physics body
               } else {
                   console.log(`[Phaser Scene] Node ${nodeId} body was already enabled. No action needed.`);
               }
               // Ensure animation restarts if needed
               if (!nodeToReEnable.anims.isPlaying) {
                  console.log(`[Phaser Scene] Restarting 'node_active' animation for node: ${nodeId}`);
                  nodeToReEnable.anims.play('node_active', true);
               }
           } else {
               console.log(`[Phaser Scene] Node ${nodeId} was already destroyed, cannot re-enable.`);
           }
       } else {
           console.warn(`[Phaser Scene] Node with ID ${nodeId} not found to re-enable.`);
       }
   }

   // Method called from React to start the interaction cooldown
   startInteractionCooldown(duration: number) {
        this.interactionOnCooldown = true;
        console.log(`[Phaser Scene] Interaction cooldown started for ${duration}ms.`);

        // Clear any existing cooldown timer
        if (this.cooldownTimerEvent) {
            // console.log("[Phaser Scene] Removing existing cooldown timer.");
            this.cooldownTimerEvent.remove(false);
        }

        // Set a timer to end the cooldown
        this.cooldownTimerEvent = this.time.delayedCall(duration, () => {
            this.interactionOnCooldown = false;
            console.log("[Phaser Scene] Interaction cooldown finished.");
        }, [], this);
    }

   // Methods to control player input enabling/disabling
   disablePlayerInput() {
       console.log("[Phaser Scene] Disabling Phaser player input (keyboard & joystick).");
       this.playerInputEnabled = false;
       this.joystickDirection = { x: 0, y: 0 }; // Reset joystick direction state
       // Stop player movement immediately when input is disabled
       if (this.player && this.player.body) {
         this.player.setVelocity(0);
         // Set to idle animation based on current or last direction
         const currentAnimKey = this.player.anims.currentAnim?.key;
         if (currentAnimKey && (currentAnimKey.startsWith('walk_') || currentAnimKey.startsWith('idle_'))) {
             const facing = currentAnimKey.split('_')[1];
             this.player.anims.play(`idle_${facing}`, true);
         } else {
             this.player.anims.play('idle_down', true); // Default idle
         }
       }
   }

   enablePlayerInput() {
       console.log("[Phaser Scene] Enabling Phaser player input (keyboard & joystick).");
       this.playerInputEnabled = true;
       // Ensure cursors/WASD are available if they were somehow cleared (shouldn't happen with current logic)
       if (this.input.keyboard && !this.cursors) {
            console.warn("[Phaser Scene] Recreating cursor keys.");
            this.cursors = this.input.keyboard.createCursorKeys();
       }
       if (this.input.keyboard && !this.wasdKeys) {
            console.warn("[Phaser Scene] Recreating WASD keys.");
            this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as any;
       }
   }

   // Method to receive joystick input data from React component
   joystickInput(data: JoystickOutputData) {
        if (!this.playerInputEnabled) {
             // Ensure direction is zeroed if input disabled, even if event fires late
             if(this.joystickDirection.x !== 0 || this.joystickDirection.y !== 0){
                this.joystickDirection = { x: 0, y: 0 };
             }
             return;
        }

        if (data.direction) {
            // Use the angle to determine direction vector
            const angle = data.angle.radian;
            this.joystickDirection.x = Math.cos(angle);
            // Negate Y because nipplejs Y might increase downwards, while Phaser Y increases upwards
            this.joystickDirection.y = -Math.sin(angle);
            // console.log(`[Joystick Move] Angle=${data.angle.degree}, Vector=(${this.joystickDirection.x.toFixed(2)}, ${this.joystickDirection.y.toFixed(2)})`);
        } else {
            // Joystick released or centered
             // console.log("[Joystick End]");
            this.joystickDirection.x = 0;
            this.joystickDirection.y = 0;
        }
    }

    // Method to highlight a specific node
    highlightNode(nodeId: string) {
        if (!this.nodes) return;

        // Clear previous highlight first
        if(this.highlightedNodeId && this.highlightedNodeId !== nodeId) {
            this.clearNodeHighlight(this.highlightedNodeId);
        }


        const nodeToHighlight = this.nodes.getChildren().find(node => {
            const spriteNode = node as Phaser.Physics.Arcade.Sprite;
            return spriteNode.getData('nodeId') === nodeId;
        }) as Phaser.Physics.Arcade.Sprite | undefined;

        if (nodeToHighlight) {
             // Only highlight if not already highlighted
            if (this.highlightedNodeId !== nodeId) {
                console.log(`[Phaser Scene] Highlighting node: ${nodeId}`);
                nodeToHighlight.setTint(0xffaa00); // Example highlight color (orange)
                nodeToHighlight.setScale(nodeToHighlight.scale * 1.2); // Make it slightly larger
                this.highlightedNodeId = nodeId;
            }
        } else {
             console.warn(`[Phaser Scene] Node with ID ${nodeId} not found to highlight.`);
        }
    }

    // Method to clear highlight from a node
    clearNodeHighlight(nodeId: string | null) {
        if (!this.nodes || !nodeId) return;

        const nodeToClear = this.nodes.getChildren().find(node => {
            const spriteNode = node as Phaser.Physics.Arcade.Sprite;
            return spriteNode.getData('nodeId') === nodeId;
        }) as Phaser.Physics.Arcade.Sprite | undefined;

        if (nodeToClear && nodeToClear.isTinted) {
            console.log(`[Phaser Scene] Clearing highlight from node: ${nodeId}`);
            nodeToClear.clearTint();
             // Ensure scale is reset correctly - get original scale if possible or divide
             // Assuming original node scale was stored or known (e.g., nodeScale = 2)
             const originalScale = 2; // Replace with stored value if available
             nodeToClear.setScale(originalScale);
             // Fallback if original scale isn't tracked:
             // nodeToClear.setScale(nodeToClear.scale / 1.2); // Less reliable

            if (this.highlightedNodeId === nodeId) {
                this.highlightedNodeId = null;
            }
        }
    }

    // Helper method to get current node count and emit update
    private updateAndEmitNodeCount() {
        if (!this.nodes || !this.onNodesCountUpdate) {
             console.warn("[Phaser Scene] Cannot update node count: nodes group or callback missing.");
            return;
        }
        // Count active nodes (nodes that haven't been destroyed)
        const count = this.nodes.countActive(true);
        // console.log(`[Phaser Scene] Emitting node count update: ${count}`);
        this.onNodesCountUpdate(count);
    }

    // --- PUBLIC METHOD TO SET UP NODES ---
    // This should be called by React (potentially in postBoot) after fetching node data
    public setupNodes(nodesData: NodeData[]) {
        console.log(`[Phaser Scene] setupNodes called with ${nodesData.length} nodes.`);
        if (!this.nodes) {
            console.error("[Phaser Scene] Nodes group not initialized in setupNodes.");
            return;
        }
        if (!this.textures.exists('node')) {
          console.error("[Phaser Scene] Node texture 'node' not loaded before setupNodes.");
          return;
        }

        // Clear existing nodes if setup is called again (e.g., map change)
        this.nodes.clear(true, true); // Destroy children and remove from scene

        const nodeScale = 2;

        nodesData.forEach((nodeInfo, index) => {
            const posX = nodeInfo.x ?? this.physics.world.bounds.width * (0.2 + (index * 0.15) % 0.6);
            const posY = nodeInfo.y ?? this.physics.world.bounds.height * (0.3 + Math.floor(index / 4) * 0.2);

            const newNode = this.nodes?.create(posX, posY, 'node')
                              .setData('nodeId', nodeInfo.nodeId)
                              .setScale(nodeScale)
                              .refreshBody();

            if (newNode) {
                 newNode.anims.play('node_active', true);
            } else {
                 console.error(`[Phaser Scene] Failed to create node ${nodeInfo.nodeId} during setupNodes`);
            }
       });

       this.updateAndEmitNodeCount(); // Update count after setting up nodes
    }

    // --- PUBLIC ZOOM METHODS ---
    public zoomIn() {
        let newZoom = this.cameras.main.zoom + this.zoomIncrement;
        newZoom = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom);
        this.cameras.main.zoomTo(newZoom, 100); // Smooth zoom
        console.log(`[Phaser Scene] Zoom In requested. New zoom target: ${newZoom.toFixed(2)}`);
    }

    public zoomOut() {
        let newZoom = this.cameras.main.zoom - this.zoomIncrement;
        newZoom = Phaser.Math.Clamp(newZoom, this.minZoom, this.maxZoom);
        this.cameras.main.zoomTo(newZoom, 100); // Smooth zoom
        console.log(`[Phaser Scene] Zoom Out requested. New zoom target: ${newZoom.toFixed(2)}`);
    }


  update(time: number, delta: number) {
    // Only process player movement if input is enabled
    if (!this.playerInputEnabled) {
         // Ensure player velocity is zero if input just got disabled
         if(this.player?.body?.velocity.x !== 0 || this.player?.body?.velocity.y !== 0) {
            this.player.setVelocity(0);
             // Optionally ensure idle animation is playing
             const currentAnimKey = this.player.anims.currentAnim?.key;
             if (currentAnimKey && (currentAnimKey.startsWith('walk_') || currentAnimKey.startsWith('idle_'))) {
                 const facing = currentAnimKey.split('_')[1];
                 this.player.anims.play(`idle_${facing}`, true);
             } else {
                 this.player.anims.play('idle_down', true); // Default idle
         }
         }
         return;
    }

    if (!this.player || !(this.player instanceof Phaser.Physics.Arcade.Sprite) || !this.player.body) {
      // console.warn("[Update] Player object missing or invalid.");
      return;
    }
    if (!this.cursors && !this.wasdKeys && (this.joystickDirection.x === 0 && this.joystickDirection.y === 0)) {
         // No input sources are active, ensure player stops and idles if needed
        if (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0) {
            this.player.setVelocity(0);
            const currentAnimKey = this.player.anims.currentAnim?.key;
            if (currentAnimKey && currentAnimKey.startsWith('walk_')) {
                 const facing = currentAnimKey.split('_')[1] || 'down';
                this.player.anims.play(`idle_${facing}`, true);
            }
        }
        return; // Do nothing if no input active
    }

    // Reset velocity
    this.player.setVelocity(0);
    let currentAnimKey = this.player.anims.currentAnim?.key;
    let isMoving = false;
    let moveX = 0;
    let moveY = 0;
    let facing = currentAnimKey?.replace('walk_', '').replace('idle_', '') || 'down'; // Track direction

    // --- Input Handling ---
    // Keyboard Input (WASD/Arrows)
    const leftPressed = this.cursors?.left.isDown || this.wasdKeys?.A.isDown;
    const rightPressed = this.cursors?.right.isDown || this.wasdKeys?.D.isDown;
    const upPressed = this.cursors?.up.isDown || this.wasdKeys?.W.isDown;
    const downPressed = this.cursors?.down.isDown || this.wasdKeys?.S.isDown;

    if (leftPressed) moveX = -1;
    else if (rightPressed) moveX = 1;

    if (upPressed) moveY = -1;
    else if (downPressed) moveY = 1;

    // Joystick Input - Use if keyboard isn't pressed
    if (moveX === 0 && moveY === 0 && (this.joystickDirection.x !== 0 || this.joystickDirection.y !== 0)) {
        moveX = this.joystickDirection.x;
        moveY = this.joystickDirection.y; // Y is now negated in joystickInput method
    }


    // --- Apply Movement ---
    isMoving = moveX !== 0 || moveY !== 0;

    if (isMoving) {
        const moveVector = new Phaser.Math.Vector2(moveX, moveY).normalize();
        this.player.setVelocity(moveVector.x * this.playerSpeed, moveVector.y * this.playerSpeed);

        // --- Determine Facing Direction ---
        // Prioritize explicit directions (up/down/left/right)
        if (Math.abs(moveY) > Math.abs(moveX)) { // Moving more vertically
            facing = moveY < 0 ? 'up' : 'down';
        } else if (Math.abs(moveX) > Math.abs(moveY)) { // Moving more horizontally
            facing = moveX < 0 ? 'left' : 'right';
        } else { // Moving perfectly diagonally, maintain previous horizontal or default to horizontal based on X
             facing = moveX < 0 ? 'left' : 'right'; // Or keep previous 'facing' if preferred
        }

    } else {
        this.player.setVelocity(0); // Explicitly stop if no input resulted in movement
    }


    // --- Animation ---
    if (isMoving) {
        const walkAnimKey = `walk_${facing}`;
        if (currentAnimKey !== walkAnimKey) {
            this.player.anims.play(walkAnimKey, true);
        }
    } else {
        // Ensure facing direction from last movement persists in idle state
        const idleAnimKey = `idle_${facing}`;
         if (currentAnimKey !== idleAnimKey && !currentAnimKey?.startsWith('idle_')) {
             this.player.anims.play(idleAnimKey, true);
         } else if (!this.player.anims.isPlaying){
             // If no animation is playing (e.g., after scene load), force idle
             this.player.anims.play(idleAnimKey, true);
         }
    }
  }

  // Cleanup timer on scene shutdown/destroy
  shutdown() {
      console.log("[Phaser Scene] Shutdown method called.");
      if (this.cooldownTimerEvent) {
          this.cooldownTimerEvent.remove(false);
      }
       this.joystickDirection = { x: 0, y: 0 }; // Reset joystick state on shutdown
       this.clearNodeHighlight(this.highlightedNodeId); // Clear any active highlight
       // Remove event listeners? Maybe not needed if scene is destroyed properly.
       this.input.off('pointerdown');
       this.input.off('pointermove');
       this.input.off('pointerup');
       this.input.off('wheel');
  }

  destroy() {
       console.log("[Phaser Scene] Destroy method called.");
      if (this.cooldownTimerEvent) {
          this.cooldownTimerEvent.remove(false);
      }
      this.joystickDirection = { x: 0, y: 0 }; // Reset joystick state on destroy
      this.clearNodeHighlight(this.highlightedNodeId); // Clear any active highlight
      // Clean up other resources if necessary
      super.destroy();
  }
}
