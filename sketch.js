const CANVAS_BG = 'black';

// Coordinate vars
let CANVAS_W, CANVAS_H;
let ARM_ORIGIN_X, ARM_ORIGIN_Y;
let TEXT_START_X, TEXT_START_Y;
let mouse_tracking;
let target_x, target_y;

// Arm vars
const ARM_WIDTH = 10;
let L1 = 100;
let L2 = 100;
let L3 = 100;

let ARM_1_COLOR = 'white';
let ARM_2_COLOR = 'white';
let ARM_3_COLOR = 'white';

// Joint vars
const JOINT_RADIUS = 10;
let JOINT_COLOR = 'red';

// Text vars
const FONT_COLOR = 'white';
const FONT_SIZE = 18;
const GAP = 10;

// Max reach vars
let MAX_REACH_DIAMETER = 0;
const MAX_REACH_COLOR = 'blue';
const MAX_REACH_WIDTH = 3;

// Toggle vars
let ENABLE_JOINTS = true;
let ENABLE_MAX_REACH = true;
let ENABLE_REACHABLE_DOT = true;

// Initial setup
function setup() {
    CANVAS_W = windowWidth;
    CANVAS_H = windowHeight;

    ARM_ORIGIN_X = CANVAS_W / 2;
    ARM_ORIGIN_Y = CANVAS_H;

    TEXT_START_X = 10;
    TEXT_START_Y = CANVAS_H - 10;

    mouse_tracking = true;

    createCanvas(CANVAS_W, CANVAS_H);
}

// Main draw function
function draw() {
    background(CANVAS_BG);

    // If mouse tracking is enabled set target coordinates to mouse loc
    if (mouse_tracking) {
        target_x = mouseX - ARM_ORIGIN_X;
        target_y = -(mouseY - ARM_ORIGIN_Y);
    }

    // Calculate phi and get ik solution for arm angles
    const phi = Math.atan2(target_y, target_x);
    const {theta1 , theta2, theta3, reachable} = InverseKinematicSolver(target_x, target_y, phi);

    // Turns theta results into usable angles
    const angle1 = theta1;
    const angle2 = theta1 + theta2;
    const angle3 = theta1 + theta2 + theta3;

    // Finds the end position of each arm so that they can be drawn as a line
    const arm1_x = ARM_ORIGIN_X + L1 * Math.cos(angle1);
    const arm1_y = ARM_ORIGIN_Y - L1 * Math.sin(angle1);

    const arm2_x = arm1_x + L2 * Math.cos(angle2);
    const arm2_y = arm1_y - L2 * Math.sin(angle2);

    const arm3_x = arm2_x + L3 * Math.cos(angle3);
    const arm3_y = arm2_y - L3 * Math.sin(angle3);

    // If max reach outline is enabled draw a circlular path spanning the sum of the member lengths
    if (ENABLE_MAX_REACH) {
        MAX_REACH_DIAMETER = (L1 + L2 + L3) * 2;
        strokeWeight(MAX_REACH_WIDTH);
        noFill();
        stroke(MAX_REACH_COLOR);
        circle(ARM_ORIGIN_X, ARM_ORIGIN_Y, MAX_REACH_DIAMETER);
    }

    // Draws each arm as a line using calculated start and end positions
    strokeWeight(ARM_WIDTH);
    stroke(ARM_1_COLOR);
    line(ARM_ORIGIN_X, ARM_ORIGIN_Y, arm1_x, arm1_y);
    stroke(ARM_2_COLOR);
    line(arm1_x, arm1_y, arm2_x, arm2_y);
    stroke(ARM_3_COLOR);
    line(arm2_x, arm2_y, arm3_x, arm3_y);

    // If joints are enabled, a circle will be drawn at each arm connection point
    if (ENABLE_JOINTS) {
        stroke(JOINT_COLOR);
        circle(arm1_x, arm1_y, JOINT_RADIUS);
        circle(arm2_x, arm2_y, JOINT_RADIUS);
        circle(arm3_x, arm3_y, JOINT_RADIUS);
    }
    noStroke();

    // If enabled and arm can reach target coordinates, display green dot on cursor
    if (reachable && ENABLE_REACHABLE_DOT) {
        fill('green');
        if(mouse_tracking) circle(mouseX, mouseY, 20);
        else circle(target_x + ARM_ORIGIN_X, -target_y + ARM_ORIGIN_Y, 20);

    }

    // If enabled and arm cannot reach target, display red dot on cursor
    else if (!reachable && ENABLE_REACHABLE_DOT) {
        fill('red');
        if(mouse_tracking) circle(mouseX, mouseY, 20);
        else circle(target_x + ARM_ORIGIN_X, -target_y + ARM_ORIGIN_Y, 20);
    }

    fill(FONT_COLOR);
    textSize(FONT_SIZE);

    // Draws current angles to screen
    text(`Angle 1: ${format_angle(angle1)}°`, TEXT_START_X, TEXT_START_Y - 40);
    text(`Angle 2: ${format_angle(angle2)}°`, TEXT_START_X, TEXT_START_Y - 20);
    text(`Angle 3: ${format_angle(angle3)}°`, TEXT_START_X, TEXT_START_Y);

    // Draws each arms end position in x and y
    text(`Arm 1: X: ${arm1_x.toFixed(2)} Y: ${arm1_y.toFixed(2)}`, TEXT_START_X, TEXT_START_Y - 100 - GAP);
    text(`Arm 2: X: ${arm2_x.toFixed(2)} Y: ${arm2_y.toFixed(2)}`, TEXT_START_X, TEXT_START_Y - 80 - GAP);
    text(`Arm 3: X: ${arm3_x.toFixed(2)} Y: ${arm3_y.toFixed(2)}`, TEXT_START_X, TEXT_START_Y - 60 - GAP);

    // Draws the target x/y positions and if target is reachable
    text(`Target X: ${target_x.toFixed(2)}`, TEXT_START_X, TEXT_START_Y - 160 - GAP * 2);
    text(`Target Y: ${target_y.toFixed(2)}`, TEXT_START_X, TEXT_START_Y - 140 - GAP * 2);
    text(`Reachable: ${reachable}`, TEXT_START_X, TEXT_START_Y - 120 - GAP * 2);

    // Displays current mouse position
    text(`Mouse Y: ${mouseY.toFixed(2)}`, TEXT_START_X, TEXT_START_Y - 180 - GAP * 3);
    text(`Mouse X: ${mouseX.toFixed(2)}`, TEXT_START_X, TEXT_START_Y - 200 - GAP * 3);
}

// Finds the ik solution given a target x and y, then returns a theta for each arm and if 
// the system can reach the target
function InverseKinematicSolver(tee_x, tee_y, phi) {
    const wx = tee_x - (L3 * Math.cos(phi));
    const wy = tee_y - (L3 * Math.sin(phi));

    // Check if the arm can reach the target
    const dist = Math.sqrt(Math.pow(wx, 2) + Math.pow(wy, 2))
    const reachable = dist <= (L1 + L2) && dist >= Math.abs(L1 - L2)

    const cosTheta2Raw = (Math.pow(wx, 2) + Math.pow(wy, 2) - Math.pow(L1, 2) - Math.pow(L2, 2)) / (2 * L1 * L2);
    const cosTheta2 = Math.max(-1, Math.min(1, cosTheta2Raw));

    const theta2 = Math.acos(cosTheta2);
    const theta1 = Math.atan2(wy, wx) - Math.atan2(L2 * Math.sin(theta2), L1 + L2 * Math.cos(theta2));
    const theta3 = phi - theta1 - theta2;

    return { theta1, theta2, theta3, reachable }
}

// Converts rad to degrees and formats the result for displaying to the screen
function format_angle(rad) {
    const angle_deg = rad * 180 / Math.PI;
    return angle_deg.toFixed(2);
}

// Input from length entry (changes length of selected arm segment)
const arm_1_len_entry = document.getElementById('arm1len');
const arm_2_len_entry = document.getElementById('arm2len');
const arm_3_len_entry = document.getElementById('arm3len');

arm_1_len_entry.addEventListener('input', () => {
    val = parseFloat(arm_1_len_entry.value);
    L1 = isNaN(val) ? 100 : val;
})
arm_2_len_entry.addEventListener('input', () => {
    val = parseFloat(arm_2_len_entry.value);
    L2 = isNaN(val) ? 100 : val;
})
arm_3_len_entry.addEventListener('input', () => {
    val = parseFloat(arm_3_len_entry.value);
    L3 = isNaN(val) ? 100 : val;
})

// Input from color picker input (changes color of selected arm segment)
const arm_1_color_picker = document.getElementById('arm1color');
const arm_2_color_picker = document.getElementById('arm2color');
const arm_3_color_picker = document.getElementById('arm3color');
const joint_color_picker = document.getElementById('jointcolor');

arm_1_color_picker.addEventListener('input', () => {
    ARM_1_COLOR = arm_1_color_picker.value;
})
arm_2_color_picker.addEventListener('input', () => {
    ARM_2_COLOR = arm_2_color_picker.value;
})
arm_3_color_picker.addEventListener('input', () => {
    ARM_3_COLOR = arm_3_color_picker.value;
})
joint_color_picker.addEventListener('input', () => {
    JOINT_COLOR = joint_color_picker.value;
})

// Handles toggle target button inputs
const toggle_mouse_tracking = document.getElementById('t_mouse_tracking');

toggle_mouse_tracking.addEventListener('click', () => {
    if(mouse_tracking) {
        mouse_tracking = false;
        return
    }

    mouse_tracking = true;
})

// Input from target x and y location (used when mouse input is disabled)
const target_x_entry = document.getElementById('target_x');
const target_y_entry = document.getElementById('target_y');

const slider_x = document.getElementById('s_target_x');
const slider_y = document.getElementById('s_target_y');

slider_x.max = `${window.innerWidth}`;
slider_y.max = `${window.innerHeight}`;

target_x_entry.addEventListener('input', () => {
    mouse_tracking = false;
    target_x = parseFloat(target_x_entry.value);
    slider_x.value = target_x + ARM_ORIGIN_X;
})

target_y_entry.addEventListener('input', () => {
    mouse_tracking = false;
    target_y = parseFloat(target_y_entry.value);
    slider_y.value = ARM_ORIGIN_Y - target_y;
})

slider_x.addEventListener('input', () => {
    mouse_tracking = false;
    target_x = parseFloat(slider_x.value) - ARM_ORIGIN_X;
    target_x_entry.value = target_x;
})

slider_y.addEventListener('input', () => {
    mouse_tracking = false;
    target_y = -(parseFloat(slider_y.value) - ARM_ORIGIN_Y);
    target_y_entry.value = target_y;
})

const x_title = document.getElementById('x_title');
const y_title = document.getElementById('y_title'); 

x_title.textContent = `x | Range (${-window.innerWidth / 2} - ${window.innerWidth / 2})`;
y_title.textContent = `y | Range (0 - ${window.innerHeight})`;

// Toggles
const max_dist_checkbox = document.getElementById('md_cb');
const joints_checkbox = document.getElementById('j_cb');
const reachability_checkbox = document.getElementById('rd_cb');

max_dist_checkbox.addEventListener('change', (event) => {
    if (event.target.checked) ENABLE_MAX_REACH = true;
    else ENABLE_MAX_REACH = false;
})
joints_checkbox.addEventListener('change', (event) => {
    if (event.target.checked) ENABLE_JOINTS = true;
    else ENABLE_JOINTS = false;
})
reachability_checkbox.addEventListener('change', (event) => {
    if (event.target.checked) ENABLE_REACHABLE_DOT = true;
    else ENABLE_REACHABLE_DOT = false;
})

// Updates main cavas and any variables dependent on window size
function windowResized(event){
    CANVAS_W = windowWidth;
    CANVAS_H = windowHeight;

    ARM_ORIGIN_X = CANVAS_W / 2;
    ARM_ORIGIN_Y = CANVAS_H;

    TEXT_START_X = 10;
    TEXT_START_Y = CANVAS_H - 10;

    target_x = CANVAS_W / 2 - ARM_ORIGIN_X;
    target_y = CANVAS_H / 2 + ARM_ORIGIN_Y;

    target_y_entry.value = CANVAS_H / 2;
    target_x_entry.value = target_x;

    slider_x.max = `${window.innerWidth}`;
    slider_x.value = target_x + ARM_ORIGIN_X;

    slider_y.max = `${window.innerHeight}`;
    slider_y.value = target_y - ARM_ORIGIN_Y;

    x_title.textContent = `x | Range (${-window.innerWidth / 2} - ${window.innerWidth / 2})`;
    y_title.textContent = `y | Range (0 - ${window.innerHeight})`;

    resizeCanvas(CANVAS_W, CANVAS_H);
}