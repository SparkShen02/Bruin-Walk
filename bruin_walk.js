import {defs, tiny} from './examples/common.js';
import {Text_Line} from "./examples/text-demo.js"

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Texture, Scene,
} = tiny;

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
            cube: new Cube(),
            text: new Text_Line(35)
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            text_image: new Material(new defs.Textured_Phong(1),
                {ambient: 1, diffusivity: 0, specularity: 0, texture: new Texture("assets/text.png")})
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
    }
}

export class Bruin_Walk extends Base_Scene {
    /**
     * This Scene object can be added to any display canvas.
     * We isolate that code so it can be experimented with on its own.
     * This gives you a very small code sandbox for editing a simple scene, and for
     * experimenting with matrix transformations.
     */
    constructor() {
        super();

        // Lanes-related attributes
        this.start_lane = 0;
        this.end_lane = 19;
        this.safe = [];
        this.dir = [];
        this.speed = [];
        for (let i = this.start_lane; i <= this.end_lane; i++) {
            this.set_lane(i);
        }

        // Player-related attributes
        this.score = 0;
        this.dead = false;
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

        // Frame-related attribute
        this.first_frame = true;
        this.light_position_y = 0;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("W", ["y"], () => {
            if (!this.move_forward) {
                this.move_forward = true;
                this.light_position_y += 2.5
                this.score += 1;
                this.end_lane += 1;
                this.set_lane(this.end_lane);
                this.start_lane = Math.max(0, this.end_lane - 27);
            }
        });
        this.key_triggered_button("A", ["g"], () => {
            this.move_left = true;
        });
        this.key_triggered_button("S", ["h"], () => {
            if (this.distaynce_y !== 0 && !this.move_backward) {
                this.light_position_y -= 2.5
                this.score -= 1;
                this.move_backward = true;
                this.end_lane -= 1;
                this.start_lane = Math.max(0, this.start_lane - 1);
            }
        });
        this.key_triggered_button("D", ["j"], () => {
            this.move_right = true;
        });
    }

    set_lane(lane) {
        this.dir[lane] = (Math.random() > 0.5) ? 1 : -1;
        this.speed[lane] = Math.random() + 0.4;
        let choice = Math.floor(Math.random() * 8) + 1; // random between 1 and 8
        this.safe[lane] = (choice === 1);
    }

    draw_text(context, program_state) {
        if (!this.dead) {
            const score_text = "Current Score: " + this.score;
            this.shapes.text.set_string(score_text, context.context);
            let model_transform = Mat4.translation(-14, 12, 5);
            model_transform = model_transform.times(Mat4.translation(0, this.distance_y, 0));
            model_transform = model_transform.times(Mat4.rotation(0.44, 0, 0, 1).times(Mat4.rotation(0.9, 1, 0, 0).times(Mat4.scale(0.6, 0.6, 0.6))));
            this.shapes.text.draw(context, program_state, model_transform, this.materials.text_image);
        }
        else {
            const score_text = "Game has ended. Your score was " + this.score + "!";
            this.shapes.text.set_string(score_text, context.context);
            let model_transform = Mat4.translation(-1.7, 0.3, 0);
            model_transform = model_transform.times(Mat4.scale(0.07, 0.07, 0.07));
            this.shapes.text.draw(context, program_state, model_transform, this.materials.text_image);
        }
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
        let body_transform = model_transform.times(Mat4.scale(0.7, 1, 0.5))
        let head_transform = model_transform.times(Mat4.translation(0, 0.4, 0.8)).times(Mat4.scale(0.5, 0.4, 0.45))
        let feet1_transform = model_transform.times(Mat4.translation(-0.4, -0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let feet2_transform = model_transform.times(Mat4.translation(0.4, -0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let feet3_transform = model_transform.times(Mat4.translation(-0.4, 0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let feet4_transform = model_transform.times(Mat4.translation(0.4, 0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let ear1_transform = model_transform.times(Mat4.translation(0.35, 0.4, 1.3)).times(Mat4.scale(0.13, 0.13, 0.13))
        let ear2_transform = model_transform.times(Mat4.translation(-0.35, 0.4, 1.3)).times(Mat4.scale(0.13, 0.13, 0.13))
        let beak_transform = model_transform.times(Mat4.translation(0, 0.8, 0.8)).times(Mat4.scale(0.2, 0.4, 0.2))
        this.shapes.cube.draw(context, program_state, body_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, head_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, feet1_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, feet2_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, feet3_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, feet4_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, ear1_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, ear2_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, beak_transform, this.materials.plastic.override({color: hex_color("#CD7F32")}));
    }

    draw_scooter(context, program_state, lane) {
        const dir = this.dir[lane];
        const speed = this.speed[lane];
        const time = program_state.animation_time/1000;
        const t = time % (52 / (speed * 10));
        const x_trans = -10 + dir * (25 - speed * 10 * t) * 1.4;
        const y_trans = 2.5 * lane;

        let model_transform = Mat4.translation(x_trans, y_trans, 0);
        let platform_transform = model_transform.times(Mat4.translation(0, 0, -0.3)).times(Mat4.scale(1.7, 0.5, 0.2))
        let handle_transform = model_transform.times(Mat4.translation(-1.5 * dir, 0, 1.9)).times(Mat4.scale(0.2, 1, 0.2))
        let stick_transform = model_transform.times(Mat4.translation(-1.5 * dir, 0, 0.83)).times(Mat4.scale(0.2, 0.2, 0.92))
        let wheel1_transform = model_transform.times(Mat4.translation(-1.3 * dir, 0, -0.8)).times(Mat4.scale(0.4, 0.15, 0.3))
        let wheel2_transform = model_transform.times(Mat4.translation(1.2 * dir, 0, -0.8)).times(Mat4.scale(0.4, 0.15, 0.3))
        model_transform = model_transform.times(Mat4.translation(0.3 * dir, 0, 1))
        let body_transform = model_transform.times(Mat4.rotation(Math.PI/2 * dir, 0, 0, 1)).times(Mat4.scale(0.7, 1, 0.5))
        let head_transform = model_transform.times(Mat4.rotation(Math.PI/2  * dir, 0, 0, 1)).times(Mat4.translation(0, 0.4, 0.8)).times(Mat4.scale(0.5, 0.4, 0.45))
        let feet1_transform = model_transform.times(Mat4.rotation(Math.PI/2 * dir, 0, 0, 1)).times(Mat4.translation(-0.4, -0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let feet2_transform = model_transform.times(Mat4.rotation(Math.PI/2  * dir, 0, 0, 1)).times(Mat4.translation(0.4, -0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let feet3_transform = model_transform.times(Mat4.rotation(Math.PI/2 * dir, 0, 0, 1)).times(Mat4.translation(-0.4, 0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let feet4_transform = model_transform.times(Mat4.rotation(Math.PI/2  * dir, 0, 0, 1)).times(Mat4.translation(0.4, 0.7, -0.8)).times(Mat4.scale(0.2, 0.2, 0.3))
        let ear1_transform = model_transform.times(Mat4.rotation(Math.PI/2  * dir, 0, 0, 1)).times(Mat4.translation(0.35, 0.4, 1.3)).times(Mat4.scale(0.13, 0.13, 0.13))
        let ear2_transform = model_transform.times(Mat4.rotation(Math.PI/2  * dir, 0, 0, 1)).times(Mat4.translation(-0.35, 0.4, 1.3)).times(Mat4.scale(0.13, 0.13, 0.13))
        let beak_transform = model_transform.times(Mat4.rotation(Math.PI/2 * dir, 0, 0, 1)).times(Mat4.translation(0, 0.8, 0.8)).times(Mat4.scale(0.2, 0.4, 0.2))
        this.shapes.cube.draw(context, program_state, body_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, head_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, feet1_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, feet2_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, feet3_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, feet4_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, ear1_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, ear2_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, beak_transform, this.materials.plastic.override({color: hex_color("#03254c")}));
        this.shapes.cube.draw(context, program_state, platform_transform, this.materials.plastic.override({color: hex_color("#757575")}));
        this.shapes.cube.draw(context, program_state, handle_transform, this.materials.plastic.override({color: hex_color("#757575")}));
        this.shapes.cube.draw(context, program_state, stick_transform, this.materials.plastic.override({color: hex_color("#d8d8d8")}));
        this.shapes.cube.draw(context, program_state, wheel1_transform, this.materials.plastic.override({color: hex_color("#757575")}));
        this.shapes.cube.draw(context, program_state, wheel2_transform, this.materials.plastic.override({color: hex_color("#757575")}));

        this.scooter_pos.push(x_trans);
        this.scooter_pos.push(y_trans);
    }

    draw_tree(context, program_state, lane){
        let model_transform = Mat4.translation(-10, 2.5 * lane, 0);
        let trunk_transform = model_transform.times(Mat4.translation(0, 0, -0.5)).times(Mat4.scale(0.5, 0.5, 0.5))
        let leaf_transform = model_transform.times(Mat4.translation(0, 0, 1.32)).times(Mat4.scale(1, 1, 1.3))
        this.shapes.cube.draw(context, program_state, trunk_transform, this.materials.plastic.override({color: hex_color("#80471c")}));
        this.shapes.cube.draw(context, program_state, leaf_transform, this.materials.plastic.override({color: hex_color("#154F30")}));
    }

    collide(player_center_x, player_center_y, player_center_z, scooter_center_x, scooter_center_y){
        let player_top_left_x = player_center_x - 0.7;
        let player_top_left_y = player_center_y + 1;
        let player_bot_right_x = player_center_x + 0.7;
        let player_bot_right_y = player_center_y - 1;
        let scooter_top_left_x = scooter_center_x - 1.7;
        let scooter_top_left_y = scooter_center_y + 1;
        let scooter_bot_right_x = scooter_center_x + 1.7;
        let scooter_bot_right_y = scooter_center_y - 1;

        // If one cube is on the left of the other (x direction)
        if (player_top_left_x >= scooter_bot_right_x || scooter_top_left_x >= player_bot_right_x)
            return false;

        // If one cube is above the other (y direction)
        if (player_bot_right_y >= scooter_top_left_y || scooter_bot_right_y >= player_top_left_y)
            return false;

        return true;
    }

    detect_collision() {
        if (!this.first_frame) {
            // Collision detection (using the last frame due to display latency)
            for (let i = 0; i < this.last_scooter_pos.length; i += 2) {
                if (this.collide(this.last_player_x, this.last_player_y, this.last_player_z, this.last_scooter_pos[i], this.last_scooter_pos[i+1])){
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

        // Set camera
        if (!this.dead) {
            let desired = Mat4.translation(0.3, -5, -22).times(Mat4.rotation(-0.25 * Math.PI, 1, 0, 0)).times(Mat4.rotation(-0.14 * Math.PI, 0, 0, 1));
            desired = desired.times(Mat4.translation(0, -this.distance_y, 0));
            program_state.set_camera(desired);
        }
        else {
            program_state.set_camera(Mat4.look_at(...Vector.cast([0, 0, 4], [0, 0, 0], [0, 1, 0])));
        }

        // Set light
        program_state.lights = [new Light(vec4(20, this.light_position_y, 5, 1), color(1, 1, 1, 1), 1000)];

        // Draw text
        this.draw_text(context, program_state);

        if (this.dead)
            return;

        // Draw roads
        for (let i = this.start_lane; i <= this.end_lane; i++) {
            this.draw_road(context, program_state, i + 1, this.safe[i]);
        }

        // Draw player, scooters, and trees
        this.draw_player(context, program_state);
        this.scooter_pos = [];
        for (let i = this.start_lane; i <= this.end_lane; i++) {
            if (!this.safe[i]) {
                this.draw_scooter(context, program_state, i+1);
            }
            else {
                this.draw_tree(context, program_state, i+1);
            }
        }

        // Detect collision and possibly end the game
        this.detect_collision();

        // Record the last frame (collision detection uses the last frame due to display latency)
        this.record_frame();
    }
}