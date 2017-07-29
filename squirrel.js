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
    
    this.vector = this.end.position.minus(this.start.position);
    this.unit = this.vector.normalized();
    this.length = this.vector.length();
  }
  
  distanceTo(point) {
    return point.distanceTo(this.projectPoint(point));
  }
  
  project(point) {
    // https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment#1501725
    var [v, w, p] = [this.start.position, this.end.position, point];
    
    var t = p.minus(v).dot(this.vector) / (this.length * this.length);
    return Math.max(0, Math.min(1, t));
  }
  
  projectPoint(point) {
    return this.start.position.plus(this.vector.times(this.project(point)));
  }
  
  toString() {
    return `${this.start}-${this.end}`;
  }
  
  coversX(x) {
    if (x >= this.start.position.x && x <= this.end.position.x) {
      return true;
    }
    if (x <= this.start.position.x && x >= this.end.position.x) {
      return true;
    }
    return false;
  }
}

class Vertex {
  constructor(name, position) {
    this.name = name;
    this.position = position;
    this.exits = [];
    this.entries = [];
  }
  
  connect(to, ground=false) {
    var edge = new Edge(this, to, ground);
    this.exits.push(edge);
    to.entries.push(edge);
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
  }
  
  tick() {
    this.direction = this.rawDirection(); //.times(0.2).add(this.direction.times(0.8));
    this.jump = this.keys[' '];
  }
  
  rawDirection() {
    var d = v`0, 0`;
    if (this.keys['a']) { d.x = -1; }
    if (this.keys['d']) { d.x =  1; }
    if (this.keys['w']) { d.y = -1; }
    if (this.keys['s']) { d.y =  1; }
    
    return d.normalized();
  }
}

class World {
  constructor() {
    this.loadPaths();
    this.mobs = [new Squirrel(this)];
  }
  
  loadPaths() {
    var a = new Vertex('a', v`10, 10`);
    var b = new Vertex('b', v`450, 10`);
    var c = new Vertex('c', v`450, 200`);
    var d = new Vertex('d', v`800, 100`);
    var e = new Vertex('e', v`450, 100`);
    
    var base = new Vertex('_', v`450, 500`);
    var left = new Vertex('l', v`0, 550`);
    var right = new Vertex('r', v`1280, 530`);
    
    this.edges = [
      a.connect(b),
      a.connect(c),
      b.connect(d),
      c.connect(d),
      e.connect(a),
      e.connect(b),
      e.connect(c),
      e.connect(d),
      c.connect(base),
      left.connect(base, true),
      right.connect(base, true)
    ]
    
    this.groundEdges = this.edges.filter((e) => e.ground);
    
    this.vertices = [a, b, c, d, e, base, left, right];
  }
  
  tick(input) {
    input.tick();
    for (var mob of this.mobs) {
      mob.tick(input);
    }
  }
}

class EdgeMovement {
  constructor(world, position) {
    this.speed = 5;
    this.world = world;
    
    this.leapTo(position);
  }
  
  leapTo(position) {
    this.edge = this.closestEdgeTo(position);
    this.edgePosition = this.edge.project(position) * this.edge.length;    
    this.position = this.edge.start.position.plus(this.edge.unit.times(this.edgePosition));
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
    var leap = input.direction.times(this.speed);
    var leapTarget = this.position.plus(leap);
    
    if (input.jump) { 
      return new AirMovement(this.world, leapTarget, leap, this.edge);
    }

    this.leapTo(leapTarget);
    return this;
  }
}

class AirMovement {
  constructor(world, position, velocity) {
    this.accelerationMix = 0.95;
    this.speed = 5;
    this.grabDistance = 10;
    
    this.gravity = v`0, 0.4`;
    this.velocity = new Vector(velocity.x, -5);
    this.world = world;
    this.position = position;
  }
  
  move(input) {
    this.velocity = this.velocity.mixWith(input.direction.times(this.speed), 
                                          this.accelerationMix);
    this.velocity.add(this.gravity);
    this.position.add(this.velocity);
    
    if (!input.jump) {
      var potentialEdge = new EdgeMovement(this.world, this.position);
      if (potentialEdge.position.distanceTo(this.position) < this.grabDistance) {
        return potentialEdge;
      }
    }
  
    for (var edge of this.world.groundEdges) {
      if (edge.coversX(this.position.x)) {
        var pointAlongGround = edge.projectPoint(this.position);
        if (pointAlongGround.y < this.position.y) {
          return new EdgeMovement(this.world, pointAlongGround);
        }
      }
    }    

    return this;
  }
}

class Squirrel {
  constructor(world) {
    this.movement = new EdgeMovement(world, v`50, 50`);
  }
  
  tick(input) {
    this.movement = this.movement.move(input);
    this.position = this.movement.position;
  }
}

class Renderer {
  constructor(canvas, world, input) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.world = world;
    this.input = input;
  }
  
  render() {
    this.world.tick(this.input);
    
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (var edge of this.world.edges) {
      if (edge.ground) {
        this.context.strokeStyle = 'green';
      } else {
        this.context.strokeStyle = 'black';
      }
      this.context.beginPath();
      this.context.moveTo(edge.start.position.x, edge.start.position.y);
      this.context.lineTo(edge.end.position.x, edge.end.position.y);
      this.context.stroke();
    }
    
    this.context.fillStyle = 'black';
    for (var vertex of this.world.vertices) {
      this.context.beginPath();
      this.context.arc(vertex.position.x, vertex.position.y, 5, 0, 2 * Math.PI, false);
      this.context.fill();
    }
    
    if (this.input.jump) {
      this.context.fillStyle = 'red';
    } else {
      this.context.fillStyle = 'brown';
    }
    for (var mob of this.world.mobs) {
      this.context.beginPath();
      this.context.arc(mob.position.x, mob.position.y, 5, 0, 2 * Math.PI, false);
      this.context.fill();       
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
