import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

const num_lanes = 19;

class Cube extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}

class Base_Scene extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'cube': new Cube(),
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
        };
    }

    display(context, program_state) {
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0.3, -5, -22)
                                     .times(Mat4.rotation(-0.25 * Math.PI, 1, 0, 0))
                                     .times(Mat4.rotation(-0.14 * Math.PI, 0, 0, 1)));
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
    }
}

export class Assignment2 extends Base_Scene {
    /**
     * This Scene object can be added to any display canvas.
     * We isolate that code so it can be experimented with on its own.
     * This gives you a very small code sandbox for editing a simple scene, and for
     * experimenting with matrix transformations.
     */
    constructor() {
        super();

        this.safe_roads = [];
        for (let i = 0; i < num_lanes; i++) {
            let choice = Math.floor(Math.random() * 5) + 1; // random between 1 and 5
            this.safe_roads[i] = (choice === 1);
        }

        this.buffer_x = 0;
        this.buffer_y = 0;
        this.distance_x = 0;
        this.distance_y = 0;
        this.distance_z_x = 0;
        this.distance_z_y = 0;

        this.start_time = -1;
        this.move_forward = false;
        this.move_backward = false;
        this.move_right = false;
        this.move_left = false;
        
        this.right = 0;
        this.left = 0;
        this.lane = [];
        this.speed = [];
        this.dead = false;
        for (let i = 0; i < num_lanes; i++) {
            let a = Math.random();
            this.lane[i] = (a > 0.5) ? 1 : -1;
        }
        for (let i = 0; i < num_lanes; i++) {
            let a = Math.random();
            this.speed[i] = a + 0.5;
        }

        this.first_frame = true;
    }

    make_control_panel(program_state) {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("W", ["y"], () => {
            this.move_forward = true;
        });
        this.key_triggered_button("A", ["g"], () => {
            this.left += 2.5;
            this.move_left = true;
        });
        this.key_triggered_button("S", ["h"], () => {
            this.move_backward = true;
        });
        this.key_triggered_button("D", ["j"], () => {
            this.right += 2.5;
            this.move_right = true;
        });
    }

    draw_road(context, program_state, lane, safe) {
        let model_transform = Mat4.translation(0, 2.5 * lane, -1).times(Mat4.scale(50, 1, 0));
        let color = (safe === true) ? hex_color("#00FF00") : hex_color("#ffffff");
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: color}));
    }

    draw_player(context, program_state) {
        if (this.move_forward === true || this.move_backward === true
            || this.move_left === true || this.move_right === true){
            let t = program_state.animation_time/1000;
            if (this.start_time === -1){
                this.start_time = t;
            }
            
            if (this.move_forward === true){
                this.distance_y += (t - this.start_time);
            }
            else if (this.move_backward === true){
                this.distance_y -= (t - this.start_time);
            }
            else if (this.move_right === true) {
                this.distance_x += (t - this.start_time);
            }
            else if (this.move_left === true) {
                this.distance_x -= (t - this.start_time);
            }
            let count_x = Math.abs(this.distance_x - this.buffer_x);
            let count_y = Math.abs(this.distance_y - this.buffer_y);
            this.distance_z_x = (2.5 * count_x - count_x * count_x) * 2;
            this.distance_z_y = (2.5 * count_y - count_y * count_y) * 2;
            if (count_y >= 2.5 || count_x >= 2.5){
                if (this.move_forward === true || this.move_right === true){
                    this.distance_x = (Math.floor(this.distance_x / 2.5)) * 2.5;
                    this.distance_y = (Math.floor(this.distance_y / 2.5)) * 2.5;
                }
                else {
                    this.distance_x = (Math.ceil(this.distance_x / 2.5)) * 2.5;
                    this.distance_y = (Math.ceil(this.distance_y / 2.5)) * 2.5;
                }
                this.distance_z_x = 0;
                this.distance_z_y = 0;
                this.move_forward = false;
                this.move_backward = false;
                this.move_right = false;
                this.move_left = false;
                this.start_time = -1;
            }
        }
        else {
            this.buffer_x = this.distance_x;
            this.buffer_y = this.distance_y;
        }

        let model_transform = Mat4.translation(this.distance_x, this.distance_y, this.distance_z_x + this.distance_z_y);
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: hex_color("#1a9ffa")}));
    }

    draw_scooter(context, program_state, lane, dir, speed) {
        let time = program_state.animation_time/1000;
        let t = time % (52 / (speed * 10));
        const x_trans = -10 + dir * (25 - speed * 10 * t);
        const y_trans = 2.5 * lane;
        let model_transform = Mat4.translation(x_trans, y_trans, 0);
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color: hex_color("#ffff00")}));
        this.scooter_pos.push(x_trans);
        this.scooter_pos.push(y_trans);
    }

    collide(cube1_center_x, cube1_center_y, cube1_center_z, cube2_center_x, cube2_center_y){
        // If one cube is on top of the other (z direction)
        if (cube1_center_z > 2)
            return false;

        let cube1_top_left_x = cube1_center_x - 1;
        let cube1_top_left_y = cube1_center_y + 1;
        let cube1_bot_right_x = cube1_center_x + 1;
        let cube1_bot_right_y = cube1_center_y - 1;
        let cube2_top_left_x = cube2_center_x - 1;
        let cube2_top_left_y = cube2_center_y + 1;
        let cube2_bot_right_x = cube2_center_x + 1;
        let cube2_bot_right_y = cube2_center_y - 1;

        // If one cube is on the left of the other (x direction)
        if (cube1_top_left_x >= cube2_bot_right_x || cube2_top_left_x >= cube1_bot_right_x)
            return false;

        // If one cube is above the other (y direction)
        if (cube1_bot_right_y >= cube2_top_left_y || cube2_bot_right_y >= cube1_top_left_y)
            return false;

        return true;
    }

    detect_collision() {
        if (!this.first_frame) {
            // Collision detection (using the last frame due to display latency)
            for (let i = 0; i < this.last_scooter_pos.length; i += 2) {
                if (this.collide(this.last_player_x, this.last_player_y, this.last_player_z, this.last_scooter_pos[i], this.last_scooter_pos[i+1])){
                    alert('Collision detected!');
                    this.dead = true;
                }
            }
        }
        else {
            this.first_frame = false;
        }
    }

    record_frame() {
        this.last_player_x = this.distance_x;
        this.last_player_y = this.distance_y;
        this.last_player_z = this.distance_z_x + this.distance_z_y;
        this.last_scooter_pos = this.scooter_pos;
    }

    display(context, program_state) {
        super.display(context, program_state);

        if (this.dead)
            return;

        // Set camera
        let desired = Mat4.translation(0.3, -5, -22)
            .times(Mat4.rotation(-0.25 * Math.PI, 1, 0, 0))
            .times(Mat4.rotation(-0.14 * Math.PI, 0, 0, 1));
        desired = desired.times(Mat4.translation(0, -this.distance_y, 0));
        program_state.set_camera(desired);

        // Draw roads
        for (let i = 0; i < num_lanes; i++) {
            this.draw_road(context, program_state, i + 1, this.safe_roads[i]);
        }

        // Draw player and scooters
        this.draw_player(context, program_state);
        this.scooter_pos = [];
        for (let i = 0; i < num_lanes; i++) {
            if (!this.safe_roads[i]) {
                let speed = this.speed[i];
                let dir = this.lane[i];
                this.draw_scooter(context, program_state, i + 1, dir, speed);
            }
        }

        // Detect collision and possibly end the game
        this.detect_collision();

        // Record the last frame (collision detection uses the last frame due to display latency)
        this.record_frame();
    }
}