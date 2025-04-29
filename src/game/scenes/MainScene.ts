
import * as Phaser from 'phaser';

// Define the types for the interaction callback
export type NodeInteractionCallback = (nodeId: string) => void;

// Remove SceneInitData interface as we will set the callback after init
// interface SceneInitData {
//   onNodeInteract: NodeInteractionCallback;
// }

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

  // Init no longer needs to receive the callback
  init(/* data: SceneInitData */) {
    // Initialization logic that doesn't depend on the callback can go here
    console.log("MainScene initializing...");
  }

  // Add a dedicated method to set the callback after the scene is created
  setInteractionCallback(callback: NodeInteractionCallback) {
    this.onNodeInteract = callback;
    console.log("Interaction callback set in MainScene.");
  }


  preload() {
    // Use placeholder pixel art URLs or local assets if available
    this.load.image('player', '/assets/images/player_placeholder_32.png'); // Example local asset path
    this.load.image('node', '/assets/images/node_placeholder_32.png'); // Example local asset path

    // Fallback to picsum if local assets fail to load (optional)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
        console.warn(`Failed to load ${file.key}, using picsum fallback.`);
        if (file.key === 'player') {
            this.textures.addBase64('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAABfklEQVR4Ae2XwWrCQBCGEwUVFB9E/CEfSq9ePRE/Qh+hLxDp1cuLoPdWH0QQvfnRX8hFVVbBQh+bSReu1Ar9g9mbmWTazJyZndkEk8zTTJWZmSHmXb6/fQ66T+NeY94VjvkMHA6HIPAiKyAvDyx/+8sZz/kELiRFAwYmYPEGXIiKAQvjO2C/JZCpAALuEYYMK4B8Q1u+1YACxhv6gY9XgPoh3DkB6B+CkFOC+gE+yDkBoH+E5w0k6B/C8wYS9R/h7SjMbw7wYJ2QkHl3L8G/7vHn/bAlh0wt9T4n9g0gwu13g6g7LALefeCcAs8MYyTDB21cQ4V4C7QLQXbA7gLdYJBzgeXoRzAfwG6G1+A/AP5G0+AUAB6j44FkGkAUfRRT4jVgx4LgLUAXoQAAaAJqN2BVgCbgbgGoAlYGxALE6QD/XmY/AQABMAmgCXASwLSAJuBNgTNAhQBzQKYBLAvIAmAQMBuQJYBVABdAJYBZQJYBfQBqAawCyAvgBNAKwDOAPwD+A9gHkC9gHsA9gf8B9gGkE5gLkAvgGtAugF4AvgIYB5Ae8BTAfwFMA1APwBNAbwC+AEAF3AG8BXAZwFuAdwEOAdwEIAF0AV8BXAU4CeAUUAQgB5QCMAG4BWAFYAlAOIBoAAkAE4BuAWgBQCSAWQCKAUwASAaQCaAGwCWAQwCmAMYC5AG4AqAPQBqAPQBqAPQBmATwCaAVYAlAIAFJAEgCTAJYBpAFIAeUCmARAAkAEABoAEACkAfAAoAfgBwAugEcA0AE4BvAQgBuAWgBqAfgCOAWgB+AbgBaAbgB6AXwA8BjgH0A4wFsAfgANAQwD+AZgGEA/gHQAygOIA/AGQBeAMwCcALADwA4gB8AWgCsAQgB8AWAFgBwAAQAUgBkARgBkAQgAsARAEIAIABMAmAEwA4AEAC4AEACgAAAABAAAACADwAUgPgBwAQgAEACQAEACQAEAAAACAAAgAAAIABAASACAAAgAAIAAACAAABAAgAAACAAAgAAAIABAACAAAgAAAgAAgAAgAAgA4AEYASAC4AMAAkAEYAIAAAAAAAAAAAAAAAAAAAADCn/QAt0f6S+eC8QQAAAABJRU5ErkJggg==');
        } else if (file.key === 'node') {
            this.textures.addBase64('node', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAIKADAAQAAAABAAAAIAAAAACshmLzAAABGUlEQVR4Ae1XPUpDQRR9txjpECgImggICmKFgoKBiIGCgpKCgoKCiIGhoaCh4aooKIgIIgiiQgQxQkSNCBGxCqGL7G7v3bv3hV3I/Q/78+dmZ5JJKiql9BchA1oCb8AvMAHdAfpA7Q9QBHwA/gK/oAr4AXQCXbA40wFfACNgAo6Bu8A1MAHn4A7sAYO9/A4cAdfAaGAR4AEw/J/aXbAFHJcBLyq+AfuAMXAOfAIGgCXAwg0x52wZ6ADeAYeAHnC54j0DBvAM3AOnAA/ApAJ8A9wAl8AS4E3h/B78BFz3q6jN8P4d0F6AAyP88sBZ4Fb1G82BwG9AB9AAfAVUeo4+G1Q+4Q0gBKAAYADAAYADAAYA/AA8AfAE4AngBMAEQAQgAkAEIBMAJABMAGABQASAEgAlACYATAJgBMAFgAsAlAFIAqAKQBqAKQC+A8gL4AqAPQDqAPQCKAfgD0AKgF4AngL0AegF8AXwMcA/AHGA7gG4AuAfgDGA9gE8A/gGUA+gPEA/AGoBeAPQDmACwA8APIB/ALwAaAKwBCAHwC8AKAFAA4AAIANQASAagAkANQBKASQDSAKgAlgFIA5AGYBNAFoAlgFMApgFMAYgHkA7gCoA9AGoA9AGoA5AGIBPADwBqAVQCsAQgEIAkACQBJgNIApAFIApQHMAkgAIAEAAgAaABAAZAHwAaAH4A8AN4BHANABOAbwEIAbgFoAagH4A7AFQG+AbgDaAXQDmA3gF8APAo4B9AOIA7AN4BtAP4BmAeAD+A6QDyAPwBuAbADwA4AHmA/gCsAVACIAfAHgAoAcAAEAFAApAFIAZAEIAJAFQBKACAAgAEwAYAZACAAuABAAQAFAAAAIADAASACAACAAgAIABAASACAAgAAEAgAEAAgAAEAgAAAAgAAEAAgAAAEAAgAAAEAAAgAAIAAAAEAHAALACwAcQAmABwAjACYAEAOwG4AMAAgAAAAAAAAAAAAAAAAAAAP4X/ABUe3z/9lOaNAAAAABJRU5ErkJggg==');
        }
        // You might want to force a texture update if needed
        // this.textures.refresh();
    });

  }

  create() {
    this.cameras.main.setBackgroundColor('#E3F2FD'); // Light blue background

    // Ensure player texture exists before creating sprite
    if (!this.textures.exists('player')) {
         console.error("Player texture not loaded, cannot create sprite.");
         // Create a placeholder graphic if texture failed
          const placeholder = this.add.graphics();
          placeholder.fillStyle(0x1A237E, 1); // Dark blue
          placeholder.fillRect(92, 442, 16, 16); // Positioned approx center if 32x32
          this.player = placeholder as any; // Assign but this won't have physics
          // OR return/throw error
          return;
      }


    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setCollideWorldBounds(true);
    // Tint can be removed if using actual pixel art asset
    // this.player.setTint(0x1A237E);


    this.cursors = this.input.keyboard?.createCursorKeys();

    this.nodes = this.physics.add.staticGroup();
    // Ensure node texture exists
    if (!this.textures.exists('node')) {
      console.error("Node texture not loaded, cannot create nodes.");
      return; // Or handle gracefully
    }
    // Assign unique IDs to nodes when creating them
    const node1 = this.nodes.create(300, 300, 'node').setData('nodeId', 'node_quiz1');
    const node2 = this.nodes.create(500, 400, 'node').setData('nodeId', 'node_quiz2');
    // Tint can be removed if using actual pixel art asset
    // node1.setTint(0xFFEB3B); // Yellow accent
    // node2.setTint(0xFFEB3B);

    // Make nodes interactive (optional, for visual feedback)
    node1.setInteractive();
    node2.setInteractive();
    node1.on('pointerover', () => node1.setAlpha(0.8));
    node1.on('pointerout', () => node1.setAlpha(1));
    node2.on('pointerover', () => node2.setAlpha(0.8));
    node2.on('pointerout', () => node2.setAlpha(1));


    // Refresh body is needed for static sprites after creation/modification
    node1.refreshBody();
    node2.refreshBody();

    // Setup overlap detection
    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);

    this.add.text(16, 16, 'Use arrow keys to move. Touch an interactive square.', {
      fontSize: '16px',
      color: '#1A237E', // Dark blue text
      fontFamily: '"Press Start 2P", monospace' // Example pixel font
     });

     // Check if the callback was set correctly (by React's postBoot)
     if (!this.onNodeInteract) {
        // This might log initially until postBoot runs, which is fine
        console.warn("onNodeInteract callback is not yet set in create(). Expected to be set via postBoot.");
     }
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
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
    }

     // Normalize and scale the velocity so that player doesn't move faster diagonally
     const velocity = this.player.body?.velocity;
     if (velocity && (velocity.x !== 0 || velocity.y !== 0)) {
         const magnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
         if (magnitude > speed) {
            this.player.setVelocity(velocity.x * speed / magnitude, velocity.y * speed / magnitude);
         }
     }
  }
}
