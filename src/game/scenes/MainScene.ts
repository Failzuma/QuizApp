
import * as Phaser from 'phaser'; // Import Phaser as a namespace

// Define the types for the interaction callback
type NodeInteractionCallback = (nodeId: string) => void;

interface SceneInitData {
  onNodeInteract: NodeInteractionCallback;
}

export default class MainScene extends Phaser.Scene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private nodes?: Phaser.Physics.Arcade.StaticGroup;
  private onNodeInteract!: NodeInteractionCallback; // Mark as definitely assigned
  private disabledNodes: Set<string> = new Set(); // Keep track of disabled nodes

  constructor() {
    super({ key: 'MainScene' });
  }

  // Receive the callback function when the scene is created/initialized
  init(data: SceneInitData) {
    if (data.onNodeInteract) {
        this.onNodeInteract = data.onNodeInteract;
        console.log("MainScene initialized with onNodeInteract callback.");
    } else {
        console.error("MainScene init called without onNodeInteract callback!");
        // Provide a default fallback or throw an error
        this.onNodeInteract = (nodeId) => console.warn(`Default onNodeInteract called for node: ${nodeId}`);
    }
  }


  preload() {
    this.load.image('player', 'https://picsum.photos/seed/playersprite/32/32');
    this.load.image('node', 'https://picsum.photos/seed/node/32/32');
    // Load actual assets here later
  }

  create() {
    this.cameras.main.setBackgroundColor('#E3F2FD');

    this.player = this.physics.add.sprite(100, 450, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setTint(0x1A237E);

    this.cursors = this.input.keyboard?.createCursorKeys();

    this.nodes = this.physics.add.staticGroup();
    // Assign unique IDs to nodes when creating them
    const node1 = this.nodes.create(300, 300, 'node').setData('nodeId', 'node_quiz1').setTint(0xFFEB3B);
    const node2 = this.nodes.create(500, 400, 'node').setData('nodeId', 'node_quiz2').setTint(0xFFEB3B);
    // It's important that node IDs match the keys in mockQuizzes in the React component
    node1.refreshBody();
    node2.refreshBody();

    this.physics.add.overlap(this.player, this.nodes, this.handleNodeOverlap, undefined, this);

    this.add.text(16, 16, 'Use arrow keys to move. Touch a yellow square.', {
      fontSize: '16px',
      color: '#1A237E',
     });

     // Check if the callback was set correctly during init
     if (!this.onNodeInteract) {
        console.error("onNodeInteract callback is missing in create()!");
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
       return;
     }

     console.log(`Player overlapped with node: ${nodeId}`);
     // Call the callback function passed from React
     this.onNodeInteract(nodeId);

     // Disable the node to prevent immediate re-triggering
     spriteNode.disableBody(true, true);
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
       nodeToEnable.enableBody(true, nodeToEnable.x, nodeToEnable.y, true, true);
       this.disabledNodes.delete(nodeId); // Remove from disabled set
       console.log(`Node ${nodeId} re-enabled.`);
     } else if (!nodeToEnable) {
        console.warn(`Node with ID ${nodeId} not found to re-enable.`);
     } else {
        console.log(`Node ${nodeId} was not disabled.`);
     }
   }


  update() {
    if (!this.cursors || !this.player) {
      return;
    }

    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-160);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(160);
    }
  }
}
