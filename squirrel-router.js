#!/usr/bin/env node

var fs = require('fs');
var parser = require('xml2json');

var routes = JSON.parse(parser.toJson(fs.readFileSync("squirrel-routes.svg")));

Array.prototype.flatten = function () {
  return this.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? toFlatten.flatten() : toFlatten);
  }, []);
}

for (var layer of routes.svg.g) {
  if (layer.id == "ref") {
    continue;
  }
  
  console.log();
  console.log("      // polyline");
  if (layer.polyline) {
    for (var polyline of [layer.polyline].flatten()) {
      var points = polyline.points.split(' ').filter((v) => v != '');
      
      for (var p = 0; p < points.length - 1; p++) {
        var [a, b] = [points[p], points[p + 1]];
        var [ax, ay] = a.split(",");
        var [bx, by] = b.split(",");
        var ground = (layer.id == "ground" ? "true" : "false");
        console.log(`      new Edge(v\`${ax}, ${ay}\`, v\`${bx}, ${by}\`, ${ground}),`);
      }
    }
    
    console.log();
    console.log("      // line");
    if (layer.line) {
      for (var line of [layer.line].flatten()) {
        var ground = (layer.id == "ground" ? "true" : "false");
        var [ax, ay, bx, by] = [line.x1, line.y1, line.x2, line.y2];
        console.log(`      new Edge(v\`${ax}, ${ay}\`, v\`${bx}, ${by}\`, ${ground}),`);
      }
    }
  }
  // console.log(layer);
}