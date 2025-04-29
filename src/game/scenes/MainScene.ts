import Phaser from 'phaser';

// Define the types for the interaction callback
type NodeInteractionCallback = (nodeId: string) => void;

export default class MainScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  private onNodeInteract: NodeInteractionCallback;

  constructor() {
    super({ key: 'MainScene' });
    // Initialize the callback placeholder
    this.onNodeInteract = () => { console.warn('onNodeInteract callback not set in MainScene'); };
  }

  // Receive the callback function when the scene is created
  init(data: { onNodeInteract: NodeInteractionCallback }) {
    this.onNodeInteract = data.onNodeInteract;
  }


  preload() {
    // Load a simple placeholder character sprite (replace with actual pixel art later)
    // Example: Using a built-in texture for simplicity
    this.load.image('player', 'https://picsum.photos/seed/playersprite/32/32'); // Simple placeholder
    this.load.image('node', 'https://picsum.photos/seed/node/32/32'); // Simple placeholder for nodes
    // In a real scenario, you'd load tilemaps, tilesets, etc.
    // this.load.image('tiles', '/assets/tilemap/tileset.png');
    // this.load.tilemapTiledJSON('map', '/assets/tilemap/map-data.json');
  }

  create() {
    // Set background color (replace with tilemap later)
    this.cameras.main.setBackgroundColor('#E3F2FD'); // Light blue background

    // Create player sprite
    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setCollideWorldBounds(true); // Keep player within game bounds
    this.player.setTint(0x1A237E); // Tint player dark blue

    // Enable keyboard input
    this.cursors = this.input.keyboard?.createCursorKeys();

    // Create some static nodes (replace with nodes from map data)
    this.nodes = this.physics.add.staticGroup();
    const node1 = this.nodes.create(300, 300, 'node').setData('nodeId', 'node_quiz1').setTint(0xFFEB3B); // Yellow node
    const node2 = this.nodes.create(500, 400, 'node').setData('nodeId', 'node_quiz2').setTint(0xFFEB3B); // Yellow node
    node1.refreshBody(); // Refresh physics body for static objects
    node2.refreshBody();

    // Add overlap detection between player and nodes
    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);

    // Basic instructions text
    this.add.text(16, 16, 'Use arrow keys to move. Touch a yellow square to trigger quiz.', {
      fontSize: '16px',
      color: '#1A237E', // Dark blue text
     });
  }

   handleNodeOverlap(player: Phaser.GameObjects.GameObject, node: Phaser.GameObjects.GameObject) {
     // Ensure types are correct for accessing data
     const spriteNode = node as Phaser.Physics.Arcade.Sprite;
     const nodeId = spriteNode.getData('nodeId') as string;

     if (nodeId && this.onNodeInteract) {
        console.log(`Player overlapped with node: ${nodeId}`);
        // Call the callback function passed from React
        this.onNodeInteract(nodeId);

        // Optional: Temporarily disable the node to prevent repeated triggering
        spriteNode.disableBody(true, true);

        // Optional: Re-enable the node after a delay (e.g., after quiz)
        // this.time.delayedCall(5000, () => {
        //    spriteNode.enableBody(true, spriteNode.x, spriteNode.y, true, true);
        // });
     }
   }


  update() {
    if (!this.cursors || !this.player) {
      return;
    }

    // Reset player velocity
    this.player.setVelocity(0);

    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
    }

    // Vertical movement
    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-160);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(160);
    }

    // Add animations based on movement direction later
    // if (this.cursors.left.isDown) {
    //   this.player.anims.play('left', true);
    // } else if (this.cursors.right.isDown) {
    //   this.player.anims.play('right', true);
    // } else {
    //   this.player.anims.play('turn');
    // }
  }
}
