
import * as Phaser from 'phaser';

// Define the types for the interaction callback
export type NodeInteractionCallback = (nodeId: string) => void;

export default class MainScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  // Make onNodeInteract potentially undefined initially
  private onNodeInteract?: NodeInteractionCallback;
  private disabledNodes: Set<string> = new Set(); // Keep track of disabled nodes

  constructor() {
    super({ key: 'MainScene' });
  }

  // Add a dedicated method to set the callback after the scene is created
  setInteractionCallback(callback: NodeInteractionCallback) {
    this.onNodeInteract = callback;
    console.log("Interaction callback set in MainScene.");
  }

  preloadAssets(){
    // Load player_placeholder as spritesheet with 16 horizontally and 8 vertically
    this.load.spritesheet('player_placeholder', '/assets/images/player_placeholder_32.png', {
        frameWidth: 32,
        frameHeight: 32,
        endFrame: 127, // 16 * 8 = 128 frames, so endFrame is 127 (0-indexed)
      });

      // Load node_placeholder as spritesheet with 2 horizontally and 1 vertically
      this.load.spritesheet('node_placeholder', '/assets/images/node_placeholder_16.png', {
          frameWidth: 16, // Corrected node size
          frameHeight: 16, // Corrected node size
          endFrame: 1,
        });
  }

  preload() {
    this.preloadAssets();

     // Log errors if assets still fail to load
     this.load.on('loaderror', (file: Phaser.Loader.File) => {
         console.error(`Failed to process file: ${file.key} from ${file.url}`);
     });
     this.load.on('filecomplete', (key: string, type: string, data: any) => {
        console.log(`Asset loaded: ${key}`);
     });
     this.load.on('complete', () => {
        console.log("Asset loading complete.");
     });

  }

  create() {
    console.log("MainScene create method started.");
    this.cameras.main.setBackgroundColor('#E3F2FD'); // Light blue background

    // Ensure player texture exists before creating sprite
    if (!this.textures.exists('player_placeholder')) {
         console.error("Player texture 'player_placeholder' not loaded or available at create time. Check preload path and network issues.");
          // Optionally add a visual placeholder if texture fails
          const placeholder = this.add.graphics();
          placeholder.fillStyle(0x1A237E, 1); // Dark blue
          placeholder.fillRect(92, 442, 32, 32); // Positioned approx center
          return; // Stop creation if essential asset is missing
      }

    this.player = this.physics.add.sprite(100, 450, 'player_placeholder', 0);
    this.player.setCollideWorldBounds(true);
    // Optional: Resize if needed, though source image should ideally match
    this.player.setDisplaySize(32, 32);


    this.cursors = this.input.keyboard?.createCursorKeys();

    this.nodes = this.physics.add.staticGroup();
    // Ensure node texture exists
    if (!this.textures.exists('node_placeholder')) {
      console.error("Node texture 'node_placeholder' not loaded or available at create time.");
       // Optionally add a visual placeholder if texture fails
       const placeholder = this.add.graphics();
       placeholder.fillStyle(0xFFEB3B, 1); // Yellow
       placeholder.fillRect(284, 284, 16, 16); // Use correct size
       placeholder.fillRect(484, 384, 16, 16); // Use correct size
      return; // Stop creation if essential asset is missing
    }
    // Assign unique IDs to nodes when creating them
    const node1 = this.nodes.create(300, 300, 'node_placeholder').setData('nodeId', 'node_quiz1');
    const node2 = this.nodes.create(500, 400, 'node_placeholder').setData('nodeId', 'node_quiz2');

    // Set display size for nodes
    node1.setDisplaySize(16, 16);
    node2.setDisplaySize(16, 16);

    // Make nodes interactive (optional, for visual feedback)
    node1.setInteractive({ useHandCursor: true }); // Add hand cursor on hover
    node2.setInteractive({ useHandCursor: true });
    node1.on('pointerover', () => { if(!this.disabledNodes.has('node_quiz1')) node1.setAlpha(0.7); });
    node1.on('pointerout', () => { if(!this.disabledNodes.has('node_quiz1')) node1.setAlpha(1); });
    node2.on('pointerover', () => { if(!this.disabledNodes.has('node_quiz2')) node2.setAlpha(0.7); });
    node2.on('pointerout', () => { if(!this.disabledNodes.has('node_quiz2')) node2.setAlpha(1); });


    // Refresh body is needed for static sprites after creation/modification
    node1.refreshBody();
    node2.refreshBody();

    // Setup overlap detection
    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);

    this.add.text(16, 16, 'Use arrow keys to move. Touch an interactive square.', {
      fontSize: '16px',
      color: '#1A237E', // Dark blue text
      // Consider adding a web font loader if using custom fonts
      // fontFamily: '"Press Start 2P", monospace'
     });

     // Check if the callback was set correctly (by React's postBoot)
     if (!this.onNodeInteract) {
        // This might log initially until postBoot runs, which is fine
        console.warn("onNodeInteract callback is not yet set in create(). Expected to be set via postBoot.");
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
     // Call the callback function passed from React
     this.onNodeInteract(nodeId);

     // Disable the node visually and physically
     spriteNode.disableBody(true, true); // Hides and disables physics
     spriteNode.setAlpha(0.5); // Make it visually distinct as disabled
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
       this.disabledNodes.delete(nodeId); // Remove from disabled set
       console.log(`Node ${nodeId} re-enabled.`);
     } else if (!nodeToEnable) {
        console.warn(`Node with ID ${nodeId} not found to re-enable.`);
     } else {
        // Node exists but wasn't in the disabled set
        console.log(`Node ${nodeId} was not in the disabled set.`);
     }
   }


  update() {
    if (!this.cursors || !this.player || !(this.player instanceof Phaser.Physics.Arcade.Sprite)) {
      return;
    }

    const speed = 160;
    // Reset velocity each frame
    this.player.setVelocity(0);

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
    }

     // Normalize and scale the velocity so that player doesn't move faster diagonally
     const velocity = this.player.body?.velocity;
     if (velocity && (velocity.x !== 0 || velocity.y !== 0)) {
         const currentSpeed = velocity.length(); // Use vector length
         if (currentSpeed > speed) {
            // Scale velocity vector to the desired speed
             velocity.normalize().scale(speed);
         }
     }
  }
}
