# Bruin Walk
Bruin Walk is a 3D WebGL endless road crossing game, inspired by Crossy Road. We tailored the game to the UCLA students and set the scene as Bruin Walk, as we're sure everyone understands the difficulty of getting to class everyday. The goal of the game is to guide a Bruin to cross the roads and avoid the scooters that are intermittently blocking the way. The final score will be calculated based on how far you get. 

We used [tiny-graphics-js](https://github.com/encyclopedia-of-code/tiny-graphics-js) to build this game. This is a JavaScript library that refractors common WebGL steps, such as vector mathematics and matrix transformations. 

<img src="assets/bruin_walk.png" width="550">

## Run
(1) Clone or download this repository. <br>
(2) Run a fake server by opening host.bat if you're using Windows, or host.command if you're using MacOS. On MacOS, you might get a security warning. If so, open the terminal, navigate to the directory, run ```chmod u+x host.command```, and then open host.command again. <br>
(3) Open your web browser and navigate to http://localhost:8200/. 

## Controls
The keyboard controls are straightforward. You may use the 'w' key to move forward, the 's' key to move back, the 'a' key to move left, and the 'd' key to move right.

## Future Extensions
(1) Add skateboarders and football players to block the roads. <br>
(2) Design a real-world mapping to Bruin Walk, with buildings such as Pauley Pavilion and John Wooden Center. 
