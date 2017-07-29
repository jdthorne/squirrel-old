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
  [x, y] = str[0].split(', ').map((c) => parseInt(c));
  return new Vector(parseInt(x), parseInt(y));
}

class Edge {
  constructor(start, end) {
    this.start = start;
    this.end = end;
    
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
}

class Vertex {
  constructor(name, position) {
    this.name = name;
    this.position = position;
    this.exits = [];
    this.entries = [];
  }
  
  connect(to) {
    var edge = new Edge(this, to);
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
    });

    doc.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
    
    doc.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }
  
  key(k) {
    return this.keys[k];
  }
  
  tick() {
    this.direction = this.rawDirection().times(0.2).add(this.direction.times(0.8));
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
    
    this.edges = [
      a.connect(b),
      a.connect(c),
      b.connect(d),
      c.connect(d),
      e.connect(a),
      e.connect(b),
      e.connect(c),
      e.connect(d)
    ]
    
    this.vertices = [a, b, c, d, e];
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
    
    this.edge = this.closestEdgeTo(position);
    this.edgePosition = this.edge.project(position) * this.edge.length;
  }
  
  closestEdgeTo(point) {
    var closestEdge = null
    var closestEdgeDistance = 100000;
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
    this.moveAlongEdge(input.direction, this.speed);
    
    return this.edge.start.position.plus(this.edge.unit.times(this.edgePosition));
  }
  
  moveAlongEdge(direction, distance) {
    var movementDirection = this.edge.unit.dot(direction);
    
    if (movementDirection == 0) { return; }
    
    var movement = movementDirection * distance;
    var newPosition = this.edgePosition + movement;
    if (newPosition > this.edge.length) {
      this.moveAlongVertex(this.edge.end, direction, newPosition - this.edge.length);
    } else if (newPosition < 0) {
      this.moveAlongVertex(this.edge.start, direction, -newPosition);
    } else {
      this.edgePosition += movement;
    }
  }
  
  moveAlongVertex(vertex, direction, distance) {
     var bestExit = {
      angle: 2 * Math.PI,
      edge: null,
      reverse: 1
    }
    
    console.log("");
    console.log("searching for exit...");
    for (var exit of vertex.exits) {
      var exit = this.vertexExit(exit, direction, 1);
      console.log(`  exit to: ${exit.edge} at angle: ${exit.angle}`);
      if (exit.angle < bestExit.angle) { bestExit = exit; }
    }
    
    for (var entry of vertex.entries) {
      var exit = this.vertexExit(entry, direction, -1);
      console.log(`  exit to: ${exit.edge} at angle: ${exit.angle} reverse`);
      if (exit.angle < bestExit.angle) { bestExit = exit; }
    }
    
    console.log(`  bestExit angle: ${bestExit.angle}`);
    
    console.log(`  exiting ${this.edge} for ${bestExit.edge} (rev? ${bestExit.reverse})`);
    
    this.edge = bestExit.edge;
    this.edgePosition = (bestExit.reverse == -1) ? this.edge.length
                                                 : 0;

    // this.moveAlongEdge(direction, distance);
  }
  
  vertexExit(edge, direction, reverse) {
    return {
      angle: Math.abs(Math.acos(
               edge.unit.times(reverse).dot(direction)
             )),
      edge,
      reverse
    }
  }
}

class Squirrel {
  constructor(world) {
    this.movement = new EdgeMovement(world, v`50, 50`);
  }
  
  tick(input) {
    this.position = this.movement.move(input);
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
    
    this.context.fillStyle = 'brown';
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
