class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  clone() {
    return new Vector(this.x, this.y);
  }
  
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  
  subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  
  multiply(c) {
    this.x *= c;
    this.y *= c;
    return this;
  }
  
  divide_by(c) {
    this.x /= c;
    this.y /= c;
    return this;
  }
  
  times(c) {
    return this.clone().multiply(c);
  }
  
  over(c) {
    return this.clone().divide_by(c);
  }
  
  plus(v) {
    return this.clone().add(v);
  }
  
  minus(v) {
    return this.clone().subtract(v);
  }
  
  dot(v) {
    return (this.x * v.x) + (this.y * v.y);
  }
  
  length() {
    return Math.sqrt((this.x * this.x) + (this.y * this.y));
  }
  
  normalized() {
    if (this.x == 0 && this.y == 0) return this;
    return this.over(this.length());
  }
  
  normalize() {
    if (this.x == 0 && this.y == 0) return this;
    return this.divide_by(this.length());
  }
  
  mixWith(v, mix) {
    this.x = (this.x * mix) + (v.x * (1 - mix));
    this.y = (this.y * mix) + (v.y * (1 - mix));
    return this;
  }
  
  distanceTo(v) {
    var dx = this.x - v.x;
    var dy = this.y - v.y;
    return Math.sqrt((dx * dx) + (dy * dy));
  }
  
  angle() {
    return Math.atan2(this.y, this.x);
  }
  
  toString() {
    return `${this.x}, ${this.y}`;
  }
}

function v(str) {
  [x, y] = str[0].split(', ').map((c) => parseFloat(c));
  return new Vector(x, y);
}

class Edge {
  constructor(start, end, ground) {
    this.start = start;
    this.end = end;
    this.ground = ground;
    
    this.vector = this.end.minus(this.start);
    this.unit = this.vector.normalized();
    this.length = this.vector.length();
  }
  
  distanceTo(point) {
    return point.distanceTo(this.projectPoint(point));
  }
  
  project(point) {
    // https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment#1501725
    var [v, w, p] = [this.start, this.end, point];
    
    var t = p.minus(v).dot(this.vector) / (this.length * this.length);
    return Math.max(0, Math.min(1, t));
  }
  
  projectPoint(point) {
    return this.start.plus(this.vector.times(this.project(point)));
  }
  
  toString() {
    return `${this.start}-${this.end}`;
  }
  
  coversX(x) {
    if (x >= this.start.x && x <= this.end.x) {
      return true;
    }
    if (x <= this.start.x && x >= this.end.x) {
      return true;
    }
    return false;
  }
}

class Vertex {
  constructor(name, position) {
    this.name = name;
    this.position = position;
  }
  
  connect(to, ground=false) {
    var edge = new Edge(this, to, ground);
    return edge;
  }
  
  toString() {
    return this.name;
  }
}

class Input {
  constructor(doc) {
    this.keys = {};
    this.mouse = v`0, 0`;
    this.touchpad = {
      base: v`0, 0`,
      tip: v`0, 0`,
      active: false,
      ids: {
        tip: null,
        jump: null
      }
    };
    this.direction = v`0, 0`;
    
    doc.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
      e.preventDefault();
    });

    doc.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
      e.preventDefault();
    });
    
    doc.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      e.preventDefault();
    });
    
    doc.addEventListener("touchstart", (e) => {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];
        var touchPoint = new Vector(touch.clientX, touch.clientY);
        
        if (touchPoint.x < window.innerWidth / 2) {
          this.touchpad.ids.tip = touch.identifier;
          this.touchpad.base = touchPoint;
          this.touchpad.active = false;
        } else {
          this.touchpad.ids.jump = touch.identifier;
        }
      }
      e.preventDefault();
    });
    
    doc.addEventListener("touchmove", (e) => {
      var touch = this.findTouch(e, this.touchpad.ids.tip);
      if (touch) {
        this.touchpad.tip.x = touch.clientX;
        this.touchpad.tip.y = touch.clientY;
        this.touchpad.active = true;
      }
      e.preventDefault();
    });

    var endTouch = (e) => {      
      var touch = this.findTouch(e, this.touchpad.ids.tip);
      if (touch) {
        this.touchpad.ids.tip = null;
        this.touchpad.active = false;
      }
      
      var jump = this.findTouch(e, this.touchpad.ids.jump);
      if (jump) {
        this.touchpad.ids.jump = null;
      }
      e.preventDefault();
    }
    doc.addEventListener("touchend", endTouch);
    doc.addEventListener("touchcancel", endTouch);
  }
  
  tick() {
    this.direction = this.keyDirection().add(this.touchDirection()).normalized();
    
    this.jump = this.keys[' '] || this.touchpad.ids.jump;
  }
  
  keyDirection() {
    var d = v`0, 0`;
    if (this.keys['a']) { d.x = -1; }
    if (this.keys['d']) { d.x =  1; }
    if (this.keys['w']) { d.y = -1; }
    if (this.keys['s']) { d.y =  1; }
    
    return d;
  }
  
  findTouch(e, id) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier == id) {
        return e.changedTouches[i];
      }
    }
  }
  
  touchDirection() {
    if (!this.touchpad.active) { return v`0, 0`; }
    
    return this.touchpad.tip.minus(this.touchpad.base);
  }
}

class World {
  constructor() {
    this.loadPaths();
    this.mobs = [new Squirrel(this)];
  }
  
  loadPaths() {
    this.edges = [

      // polyline
      new Edge(v`0, 588.5`, v`72, 588.5`, true),
      new Edge(v`72, 588.5`, v`191, 607`, true),
      new Edge(v`191, 607`, v`310, 567`, true),
      new Edge(v`310, 567`, v`415, 561`, true),
      new Edge(v`415, 561`, v`569, 584.25`, true),
      new Edge(v`569, 584.25`, v`721, 607.5`, true),
      new Edge(v`721, 607.5`, v`848, 607.5`, true),
      new Edge(v`848, 607.5`, v`1019, 615`, true),
      new Edge(v`1019, 615`, v`1133, 606`, true),
      new Edge(v`1133, 606`, v`1280, 605`, true),

      // line

      // polyline
      new Edge(v`327, 565.667`, v`317.667, 465`, false),
      new Edge(v`317.667, 465`, v`332.333, 365.667`, false),
      new Edge(v`332.333, 365.667`, v`333, 267.667`, false),
      new Edge(v`333, 267.667`, v`349, 201.667`, false),
      new Edge(v`349, 201.667`, v`381.667, 165.667`, false),
      new Edge(v`381.667, 165.667`, v`388.333, 132.667`, false),
      new Edge(v`388.333, 132.667`, v`439, 123.667`, false),
      new Edge(v`439, 123.667`, v`476.333, 129`, false),
      new Edge(v`345.667, 213.667`, v`312, 175`, false),
      new Edge(v`312, 175`, v`287.333, 165.333`, false),
      new Edge(v`287.333, 165.333`, v`250, 155.666`, false),
      new Edge(v`250, 155.666`, v`227.667, 113.666`, false),
      new Edge(v`297, 168.666`, v`287.667, 153.333`, false),
      new Edge(v`287.667, 153.333`, v`278, 126.333`, false),
      new Edge(v`278, 126.333`, v`264.333, 111.333`, false),
      new Edge(v`289.333, 166.666`, v`276.667, 174`, false),
      new Edge(v`276.667, 174`, v`251.667, 179.666`, false),
      new Edge(v`251.667, 179.666`, v`223.333, 167.666`, false),
      new Edge(v`223.333, 167.666`, v`191.667, 158.333`, false),
      new Edge(v`332.333, 280`, v`304.667, 259`, false),
      new Edge(v`304.667, 259`, v`277.667, 230.333`, false),
      new Edge(v`277.667, 230.333`, v`258.667, 223`, false),
      new Edge(v`258.667, 223`, v`225.667, 212.333`, false),
      new Edge(v`225.667, 212.333`, v`194.333, 204.667`, false),
      new Edge(v`194.333, 204.667`, v`166.667, 189.333`, false),
      new Edge(v`258.667, 223`, v`243.333, 206`, false),
      new Edge(v`243.333, 206`, v`219, 200.667`, false),
      new Edge(v`264.333, 225`, v`219.667, 242.333`, false),
      new Edge(v`219.667, 242.333`, v`165.667, 246.333`, false),
      new Edge(v`331.666, 345`, v`300.666, 326.333`, false),
      new Edge(v`300.666, 326.333`, v`265.999, 315.333`, false),
      new Edge(v`265.999, 315.333`, v`232.666, 301.667`, false),
      new Edge(v`327.167, 398.5`, v`300.333, 391.5`, false),
      new Edge(v`300.333, 391.5`, v`276, 391.5`, false),
      new Edge(v`276, 391.5`, v`244.333, 378`, false),
      new Edge(v`244.333, 378`, v`204.666, 355.333`, false),
      new Edge(v`204.666, 355.333`, v`160, 340`, false),
      new Edge(v`160, 340`, v`118.666, 337.667`, false),
      new Edge(v`118.666, 337.667`, v`76.333, 337.333`, false),
      new Edge(v`220, 363.333`, v`211, 340.333`, false),
      new Edge(v`211, 340.333`, v`194.666, 317.667`, false),
      new Edge(v`249.333, 381.333`, v`234, 402.666`, false),
      new Edge(v`234, 402.666`, v`211.333, 424.333`, false),
      new Edge(v`211.333, 424.333`, v`193, 418`, false),
      new Edge(v`180.333, 346.667`, v`149.666, 356`, false),
      new Edge(v`149.666, 356`, v`127.333, 369.333`, false),
      new Edge(v`135, 338`, v`117.333, 324.333`, false),
      new Edge(v`117.333, 324.333`, v`86.666, 318`, false),
      new Edge(v`317.667, 465`, v`282, 462`, false),
      new Edge(v`282, 462`, v`220.666, 463.333`, false),
      new Edge(v`220.666, 463.333`, v`200, 458`, false),
      new Edge(v`321.667, 440.334`, v`351, 443`, false),
      new Edge(v`351, 443`, v`370.333, 458.334`, false),
      new Edge(v`370.333, 458.334`, v`396.333, 456.334`, false),
      new Edge(v`330.667, 376.667`, v`353.333, 376.334`, false),
      new Edge(v`353.333, 376.334`, v`412, 363.334`, false),
      new Edge(v`412, 363.334`, v`533.667, 361.667`, false),
      new Edge(v`533.667, 361.667`, v`570, 358`, false),
      new Edge(v`570, 358`, v`582.333, 370`, false),
      new Edge(v`530.333, 362`, v`554.667, 387`, false),
      new Edge(v`554.667, 387`, v`576, 403.667`, false),
      new Edge(v`475, 362.334`, v`531.333, 324`, false),
      new Edge(v`531.333, 324`, v`550.333, 318.667`, false),
      new Edge(v`407.667, 364.334`, v`442.667, 401.667`, false),
      new Edge(v`442.667, 401.667`, v`478.667, 423.667`, false),
      new Edge(v`333, 322.667`, v`394.333, 330`, false),
      new Edge(v`394.333, 330`, v`413.333, 338`, false),
      new Edge(v`332.667, 286.667`, v`363.667, 282.333`, false),
      new Edge(v`363.667, 282.333`, v`424.667, 279.667`, false),
      new Edge(v`424.667, 279.667`, v`459.333, 283.333`, false),
      new Edge(v`459.333, 283.333`, v`524.333, 259`, false),
      new Edge(v`419.667, 279.333`, v`441.333, 249.667`, false),
      new Edge(v`441.333, 249.667`, v`463, 239`, false),
      new Edge(v`463, 239`, v`473, 238.667`, false),
      new Edge(v`459.333, 283.333`, v`477.333, 305.667`, false),
      new Edge(v`477.333, 305.667`, v`501.333, 307.667`, false),
      new Edge(v`501.667, 267.333`, v`509.333, 248.667`, false),
      new Edge(v`509.333, 248.667`, v`529.667, 239.667`, false),
      new Edge(v`808.666, 606.333`, v`822, 496.333`, false),
      new Edge(v`822, 496.333`, v`847.333, 407`, false),
      new Edge(v`847.333, 407`, v`851.333, 342.333`, false),
      new Edge(v`851.333, 342.333`, v`818, 277`, false),
      new Edge(v`818, 277`, v`823.333, 253.667`, false),
      new Edge(v`848.666, 364.333`, v`876.666, 355`, false),
      new Edge(v`876.666, 355`, v`929.333, 323`, false),
      new Edge(v`929.333, 323`, v`1000.666, 305.667`, false),
      new Edge(v`1000.666, 305.667`, v`1029.333, 299.667`, false),
      new Edge(v`916, 330.333`, v`926, 304.333`, false),
      new Edge(v`926, 304.333`, v`953.333, 277.667`, false),
      new Edge(v`915.333, 333`, v`924, 341.667`, false),
      new Edge(v`924, 341.667`, v`948.666, 347`, false),
      new Edge(v`948.666, 347`, v`977.333, 341`, false),
      new Edge(v`848, 379`, v`909.333, 421.666`, false),
      new Edge(v`909.333, 421.666`, v`932, 459`, false),
      new Edge(v`932, 459`, v`983.333, 482.333`, false),
      new Edge(v`983.333, 482.333`, v`1004, 494.333`, false),
      new Edge(v`926, 451.666`, v`957.333, 457.666`, false),
      new Edge(v`957.333, 457.666`, v`972, 454.333`, false),
      new Edge(v`1016.666, 425`, v`970, 412.333`, false),
      new Edge(v`970, 412.333`, v`911.333, 425`, false),
      new Edge(v`911.333, 425`, v`830, 470.333`, false),
      new Edge(v`945.333, 417.666`, v`964, 399.666`, false),
      new Edge(v`964, 399.666`, v`987.333, 393.666`, false),
      new Edge(v`823.333, 491`, v`850.666, 504.333`, false),
      new Edge(v`850.666, 504.333`, v`894.666, 517`, false),
      new Edge(v`894.666, 517`, v`934, 519`, false),
      new Edge(v`934, 519`, v`965.333, 522.333`, false),
      new Edge(v`864.833, 507.583`, v`887.416, 501.541`, false),
      new Edge(v`887.416, 501.541`, v`907.333, 489.5`, false),
      new Edge(v`907.333, 489.5`, v`925, 489.5`, false),
      new Edge(v`864, 509.666`, v`877.333, 524.333`, false),
      new Edge(v`877.333, 524.333`, v`908, 537`, false),
      new Edge(v`820, 504.333`, v`798, 489`, false),
      new Edge(v`798, 489`, v`742, 474.333`, false),
      new Edge(v`742, 474.333`, v`680, 488.333`, false),
      new Edge(v`680, 488.333`, v`642, 477.666`, false),
      new Edge(v`746.666, 474.333`, v`736, 458.333`, false),
      new Edge(v`736, 458.333`, v`700.666, 455`, false),
      new Edge(v`844, 419.666`, v`770, 387.666`, false),
      new Edge(v`770, 387.666`, v`726, 373.666`, false),
      new Edge(v`726, 373.666`, v`692.666, 346.333`, false),
      new Edge(v`850, 355.667`, v`734.666, 405`, false),
      new Edge(v`734.666, 405`, v`721, 398`, false),
      new Edge(v`721, 398`, v`699.833, 399.5`, false),
      new Edge(v`734.666, 405`, v`721.333, 412.5`, false),
      new Edge(v`721.333, 412.5`, v`682.5, 413.334`, false),
      new Edge(v`251, 588`, v`317, 482`, false),
      new Edge(v`317, 482`, v`398, 560`, false),
      new Edge(v`767, 606`, v`816, 534`, false),
      new Edge(v`816, 534`, v`854, 608`, false),
      new Edge(v`381.667, 165.667`, v`414.5, 177.5`, false),
      new Edge(v`414.5, 177.5`, v`457, 182`, false),

      // line
      new Edge(v`439, 123.667`, v`485.667, 149.667`, false),
      new Edge(v`406, 128.667`, v`462.667, 91.333`, false),
      new Edge(v`388.333, 133`, v`324, 115.333`, false),
      new Edge(v`187.667, 201.667`, v`117.333, 216.667`, false),
      new Edge(v`758, 479`, v`686.666, 512.333`, false),
      new Edge(v`726, 373.666`, v`721.333, 328.333`, false),
      new Edge(v`722, 412.5`, v`709.167, 431`, false),

    ]
    
    this.groundEdges = this.edges.filter((e) => e.ground);
  }
  
  tick(input) {
    input.tick();
    for (var mob of this.mobs) {
      mob.tick(input);
    }
  }
}

class EdgeMovement {
  constructor(world, position, velocity) {
    this.speed = 2;
    this.boost = 0;
    this.world = world;
    
    this.leapTo(position, velocity);
  }
  
  leapTo(position, velocity = null) {
    this.edge = this.closestEdgeTo(position);
    this.edgePosition = this.edge.project(position) * this.edge.length;    
    this.position = this.edge.start.plus(this.edge.unit.times(this.edgePosition));
    
    var forward = (velocity.dot(this.edge.unit) > 0);
    this.direction = this.edge.unit.times(forward ? 1 : -1);
  }
  
  closestEdgeTo(point) {
    var closestEdge = null
    var closestEdgeDistance = 100000;
    var groundEdge = null;
    for (var edge of this.world.edges) {
      var edgeDistance = edge.distanceTo(point);
      if (edgeDistance < closestEdgeDistance) {
        closestEdge = edge;
        closestEdgeDistance = edgeDistance;
      }      
    }
    
    return closestEdge;
  }
  
  move(input) {
    if (input.direction.length() > 0.5) {
      if (this.boost < this.speed) { this.boost += 0.1; }
    } else {
      this.boost = 0;
    }
    
    if (input.direction.length() == 0) { return this; }
    
    var leap = input.direction.times(this.speed + this.boost);
    var leapTarget = this.position.plus(leap);
    
    if (input.jump) { 
      return new AirMovement(this.world, leapTarget, leap, this.edge);
    }

    this.leapTo(leapTarget, leap);
    return this;
  }
}

class AirMovement {
  constructor(world, position, velocity) {
    this.acceleration = 0.05;
    
    this.gravity = v`0, 0.2`;
    this.velocity = new Vector(velocity.x * 0.8, velocity.y > 0 ? 0 : -3);
    this.world = world;
    this.position = position;
    this.direction = this.velocity.normalized();
    
    this.standoff = 5;
  }
  
  move(input) {
    var xInput = input.direction.x * this.acceleration;
    this.velocity.x += xInput;
    this.velocity.add(this.gravity);
    var speed = this.velocity.length();
    this.standoff -= 1;
    
    // Grab
    var grabRange = speed;
    if (!input.jump && this.standoff < 0) {
      var potentialEdge = new EdgeMovement(this.world, this.position, this.velocity);
      if (potentialEdge.position.distanceTo(this.position) < grabRange) {
        return potentialEdge;
      }
    }
  
    // Ground
    for (var edge of this.world.groundEdges) {
      if (edge.coversX(this.position.x)) {
        var pointAlongGround = edge.projectPoint(this.position);
        if (pointAlongGround.y < this.position.y + this.velocity.y) {
          return new EdgeMovement(this.world, pointAlongGround, this.velocity);
        }
      }
    }  
    
    // Nope, move normally
    this.position.add(this.velocity);  
    this.direction = this.velocity.normalized();

    return this;
  }
}

class Squirrel {
  constructor(world) {
    this.position = v`50, 50`;
    this.direction = v`0, 0`;
    this.movement = new EdgeMovement(world, this.position, v`0, 0`);
  }
  
  tick(input) {
    this.movement = this.movement.move(input);
    
    this.position = this.movement.position;
    this.direction = this.movement.direction;
  }
}

class Renderer {
  constructor(canvas, world, input) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.world = world;
    this.input = input;

    this.background = new Image();
    this.background.src = "squirrel.png";
    
    this.mob = new Image();
    this.mob.src = "squirrel-pic.png";
  }
  
  render() {
    this.world.tick(this.input);

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.drawImage(this.background, 0, 0);

    /*
    for (var edge of this.world.edges) {
      if (edge.ground) {
        this.context.strokeStyle = 'green';
      } else {
        this.context.strokeStyle = 'black';
      }
      this.context.beginPath();
      this.context.moveTo(edge.start.x, edge.start.y);
      this.context.lineTo(edge.end.x, edge.end.y);
      this.context.stroke();
    }
    */
    
    if (this.input.jump) {
      this.context.fillStyle = 'red';
    } else {
      this.context.fillStyle = 'brown';
    }
    
    for (var mob of this.world.mobs) {
      var angle = mob.direction.angle();
      var upsideDown = ((angle > 0.5*Math.PI) || (angle < -0.5*Math.PI));

      this.context.save();
      this.context.translate(mob.position.x, mob.position.y);
      this.context.rotate(angle);
      this.context.scale(1, upsideDown ? -1 : 1);
      this.context.drawImage(this.mob, -12, -24);
      this.context.restore();
      /*
      this.context.beginPath();
      this.context.arc(mob.position.x, mob.position.y, 5, 0, 2 * Math.PI, false);
      this.context.fill();       
      */
    }
    
    this.context.strokeStyle = 'brown';
    if (this.input.touchpad.active) {
      this.context.beginPath();
      this.context.moveTo(this.input.touchpad.base.x, this.input.touchpad.base.y);
      this.context.lineTo(this.input.touchpad.tip.x, this.input.touchpad.tip.y);
      this.context.stroke();
    }
    
    requestAnimationFrame(() => this.render());
  }  
}

document.addEventListener("DOMContentLoaded", () => {
  var canvas = document.getElementById('canvas');
  var r = new Renderer(canvas, new World(), new Input(document));
  r.render();
});

console.log("Hello!");
