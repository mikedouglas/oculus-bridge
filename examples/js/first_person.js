var VERTICAL_DELTA = 5;
var VERTICAL_SPEED = 1;

var ball;

var renderer, camera;
var scene, element;
var ambient, point;
var aspectRatio, windowHalf;
var mouse, time;

var controls;
var clock;

var oldCameraDir;

var useRift = true;

var riftCam;

var boxes = [];
var dataPackets = [];

var ground, groundGeometry, groundMaterial;

var bodyAngle;
var bodyAxis;
var bodyPosition;
var viewAngle;

var velocity;
var oculusBridge;

var particleCount = 1800,
    particles = new THREE.Geometry(),
    pMaterial = new THREE.ParticleBasicMaterial({
        size: 1,
        map: THREE.ImageUtils.loadTexture("/images/raindrop.png"),
        blending: THREE.AdditiveBlending,
        transparent: true
    });

for (var p = 0; p < particleCount; p++) {
    var pX = Math.random() * 500 - 250,
    pY = Math.random() * 500 - 250,
    pZ = Math.random() * 500 - 250,
    particle = new THREE.Vertex(new THREE.Vector3(pX, pY, pZ));

    // add it to the geometry
    particles.vertices.push(particle);
}

// Map for key states
var keys = [];
for(var i = 0; i < 130; i++){
  keys.push(false);
}

Physijs.scripts.worker = '/examples/lib/physijs_worker.js';
Physijs.scripts.ammo = '/examples/lib/ammo.js';

function initScene() {
  clock = new THREE.Clock();
  mouse = new THREE.Vector2(0, 0);

  windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
  aspectRatio = window.innerWidth / window.innerHeight;
  
  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, 0, 0));
  scene.addEventListener('update', function () {
      scene.simulate();
  })

  camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);

  camera.position.set(100, 150, 100);
  camera.lookAt(new THREE.Vector3(0, 150, 100));

  // Initialize the renderer
  renderer = new THREE.WebGLRenderer({antialias:true});
  //renderer.setClearColor(0xdbf7ff);
  renderer.setClearColor(0x839499);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMapEnabled = true;
  renderer.shadowMapSoft = true;

  //scene.fog = new THREE.Fog(0xdbf7ff, 300, 700);
  scene.fog = new THREE.Fog(0x839499, 300, 700);

  element = document.getElementById('viewport');
  element.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera);
}


function initLights(){

  ambient = new THREE.AmbientLight(0x222222);
  scene.add(ambient);

  point = new THREE.DirectionalLight( 0xffffff, 1, 0, Math.PI, 1 );
  point.position.set( -250, 250, 150 );
  point.castShadow = true;
  
  scene.add(point);

  var particleSystem = new THREE.ParticleSystem(particles, pMaterial);
  particleSystem.sortParticles = true;
  scene.add(particleSystem);
}

var floorTexture;
function initGeometry(){

  floorTexture = new THREE.ImageUtils.loadTexture( "textures/grass_tile.jpg" );
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
  floorTexture.repeat.set( 50, 50 );
  floorTexture.anisotropy = 32;

  var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture } );
  var floorGeometry = new THREE.CubeGeometry(5000, 5000, 2, 10, 10);
  var floor = new Physijs.BoxMesh(floorGeometry, Physijs.createMaterial(floorMaterial, 0.4, 0.8), 0);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;

  scene.add(floor);

  ball = new Physijs.SphereMesh(
          new THREE.SphereGeometry(Math.random() * (4-1) + 1, 16, 16),
          Physijs.createMaterial(new THREE.MeshLambertMaterial({color:0xff0000, reflectivity: 0.8}), .8, 0), 7);
  ball.position.set(100, 150, 100);
  scene.add(ball);
  ball.setLinearVelocity(new THREE.Vector3(0, 0, 0));

  var city  = new THREEx.ProceduralCity();
  scene.add(city);

  // add some boxes
  /*
  var boxTexture = new THREE.ImageUtils.loadTexture( "textures/blue_blue.jpg" );
  for(var i = 0; i < 200; i++){
    var material = new THREE.MeshLambertMaterial({ emissive:0x505050, map: boxTexture, color: 0xffffff});
    
    var height = Math.random() * 150+10;
    var width = Math.random() * 20 + 2;
    
    var box = new THREE.Mesh( new THREE.CubeGeometry(width, height, width), material);

    box.position.set(Math.random() * 1000 - 500, height/2 ,Math.random() * 1000 - 500);
    box.rotation.set(0, Math.random() * Math.PI * 2, 0);
    
    boxes.push(box);
    scene.add(box);
  }
  */
}


function init(){

  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mousemove', onMouseMove, false);

  document.getElementById("toggle-render").addEventListener("click", function(){
    useRift = !useRift;
    onResize();
  });

  document.getElementById("help").addEventListener("click", function(){
    var el = document.getElementById("help-text");
    el.style.display = (el.style.display == "none") ? "" : "none";
  });

  window.addEventListener('resize', onResize, false);

  time          = Date.now();
  bodyAngle     = 0;
  bodyAxis      = new THREE.Vector3(0, 1, 0);
  bodyPosition  = new THREE.Vector3(0, 15, 0);
  velocity      = new THREE.Vector3();

  initScene();
  initGeometry();
  initLights();
  
  oculusBridge = new OculusBridge({
    "debug" : true,
    "onOrientationUpdate" : bridgeOrientationUpdated,
    "onConfigUpdate"      : bridgeConfigUpdated,
    "onConnect"           : bridgeConnected,
    "onDisconnect"        : bridgeDisconnected
  });
  oculusBridge.connect();

  riftCam = new THREE.OculusRiftEffect(renderer);
}


function onResize() {
  if(!useRift){
    windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    aspectRatio = window.innerWidth / window.innerHeight;
   
    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
   
    renderer.setSize(window.innerWidth, window.innerHeight);
  } else {
    riftCam.setSize(window.innerWidth, window.innerHeight);
  }
}


function bridgeConnected(){
  document.getElementById("logo").className = "";
}

function bridgeDisconnected(){
  document.getElementById("logo").className = "offline";
}

function bridgeConfigUpdated(config){
  console.log("Oculus config updated.");
  riftCam.setHMD(config);      
}

function bridgeOrientationUpdated(quatValues) {

  // Do first-person style controls (like the Tuscany demo) using the rift and keyboard.

  // TODO: Don't instantiate new objects in here, these should be re-used to avoid garbage collection.

  // make a quaternion for the the body angle rotated about the Y axis.
  var quat = new THREE.Quaternion();
  quat.setFromAxisAngle(bodyAxis, bodyAngle);

  // make a quaternion for the current orientation of the Rift
  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  // multiply the body rotation by the Rift rotation.
  quat.multiply(quatCam);


  // Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
  var xzVector = new THREE.Vector3(0, 0, 1);
  xzVector.applyQuaternion(quat);

  // Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
  // so you can steer with a combination of the keyboard and by moving your head.
  viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

  // Apply the combined look/body angle to the camera.
  camera.quaternion.copy(quat);
}


function onMouseMove(event) {
  mouse.set( (event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
}


function onMouseDown(event) {
  // Stub
  floorTexture.needsUpdate = true;
  console.log("update.");
}


function onKeyDown(event) {

  if(event.keyCode == 48){ // zero key.
    useRift = !useRift;
    onResize();
  }

  // prevent repeat keystrokes.
 if(!keys[90] && (event.keyCode == 90)){ // Spacebar to jump
   ball.applyCentralImpulse(new THREE.Vector3(0, 500, 0));
 }

  console.log("Key Down: " + event.keyCode);
  keys[event.keyCode] = true;
}


function onKeyUp(event) {
  keys[event.keyCode] = false;

  console.log("Key Up: " + event.keyCode);
}


function updateInput(delta) {
  
  // Doesn't affect your Y velocity at all.
  var oldVelo = ball.getLinearVelocity();
  var velo = new THREE.Vector3(0, 0, -50);
  if(keys[32]){ //space
      velo.applyQuaternion(camera.quaternion);

      if(keys[90]) { //Z
          velo.y = 50;
      }
      else if(keys[88]) {
          velo.y = -50;
      }
      else {
          velo.y = oldVelo.y;
      }
      ball.setLinearVelocity(velo);
  }
  else {
      ball.setLinearVelocity(new THREE.Vector3(0, 0, 0));
  }
 
  // update the camera position when rendering to the oculus rift.
  if(useRift) {
    camera.position.set(ball.position.x, ball.position.y, ball.position.z);
  }
}


function animate() {
  var delta = clock.getDelta();
  time += delta;
  
  updateInput(delta);
  
  if(render()){
    requestAnimationFrame(animate);  
  }
}

function crashSecurity(e){
  oculusBridge.disconnect();
  document.getElementById("viewport").style.display = "none";
  document.getElementById("security_error").style.display = "block";
}

function crashOther(e){
  oculusBridge.disconnect();
  document.getElementById("viewport").style.display = "none";
  document.getElementById("generic_error").style.display = "block";
  document.getElementById("exception_message").innerHTML = e.message;
}

function render() { 
    if(useRift){
      riftCam.render(scene, camera);
    }else{
      controls.update();
      renderer.render(scene, camera);
    }  
  return true;
}


window.onload = function() {
  init();
  animate();
  scene.simulate();
}
