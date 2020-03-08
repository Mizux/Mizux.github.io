// Color Structure
var blob = {
  seed: 3,
  fg: "#FFF",
  stroke: "#FFF",
  bg: "#000",
  count: 20,
  spawn: 40,
  offset: 100,
  fills: 0.95,
};

// Implementation of MT19947
// see: https://en.wikipedia.org/wiki/Mersenne_Twister
var PRNG = function(exports) {
  const w = 32;
  const n = 624;
  const m = 397;
  const r = 31;

  const a = 0x9908B0DF;

  const u = 11;
  const d = 0xffffffff;

  const s= 7;
  const b = 0x9D2C5680;

  const t = 15;
  const c = 0xEFC60000;

  const l = 18;

  const lower_mask =  ( ( 1 << r ) >>> 0) - 1;
  const upper_mask = lower_mask + 1;

  const f = 1812433253;

  function setSeed(seed) {
    exports.index = 0;
    exports.MT[ 0 ] = seed;
    for(var i = 1 ; i < n; i++) {
      exports.MT[ i ] = (f * (exports.MT[i-1] ^ (exports.MT[ i-1 ] >> (w - 2) ) + i));
    }
  }

  function extractNumber() {
    if(exports.index == 0) { exports.generateNumbers() }

    var y = exports.MT[ exports.index ];
    y = y ^ ((y >> u) & d);
    y = y ^ ((y << s) & b);
    y = y ^ ((y << t) & c);
    y = y ^ (y >> l);

    exports.index = (exports.index + 1) % n;
    return y;
  }

  function generateNumbers() {
    for(var i = 0; i < n; i++) {
      var x = (exports.MT[ i ] & upper_mask) +
        (exports.MT[(i + 1) % n ] & lower_mask);
      var xA = (x >> 1);
      if (x % 2 != 0) {
        xA = xA ^ a;
      }
      exports.MT[ i ] = exports.MT[ (i + m) % n] ^ xA;
    }
  }

  function random() {
    const res = exports.extractNumber() / lower_mask;
    //console.log(`value: ${res}`);
    return res;
  }

  exports.MT = new Uint32Array(n);
  exports.generateNumbers = generateNumbers;
  exports.extractNumber = extractNumber;
  exports.setSeed = setSeed;
  exports.random = random;
  // Initialize
  setSeed(0);
  return exports;
}({});

function squareDistance(v1, v2) {
  var dx = (v2[0]-v1[0]);
  var dy = (v2[1]-v1[1]);
  return dx*dx + dy*dy;
}

function norm(t, a, b) {
  return (t - a) / (b - a);
}

//////////////////////////////////////////
var size = 1024;
var canvas = document.createElement('canvas');
canvas.style.position ="absolute";
canvas.style.top ="0";
canvas.style.left ="0";
canvas.width = canvas.height = size;
ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

// GUI
var gui = new dat.GUI({ load: JSON });
gui.add(blob, "seed", 0, 64, 1);
var colorGUI = gui.addFolder("Color");
{
  colorGUI.addColor(blob, "fg");
  colorGUI.addColor(blob, "stroke");
  colorGUI.addColor(blob, "bg");
  //colorGUI.open();
}
var paramsGUI = gui.addFolder("Params");
{
  paramsGUI.add(blob, "count", 1, 100, 1);
  paramsGUI.add(blob, "spawn", 1, 100, 1);
  paramsGUI.add(blob, "offset", 1, 500, 1);
  paramsGUI.add(blob, "fills", 0.75, 1.00, 0.0125);
  //paramsGUI.open();
}
gui.close();


var vertices;

function update() {
  PRNG.setSeed(blob.seed);

  var r, a, v, o;
  var count   = blob.count;
  var spawn   = blob.spawn;
  var offset  = blob.offset;
  vertices = [];
  for(var i = 0; i < count; i++) {
    r = (PRNG.random() - .5)  * window.innerWidth / 2;
    a = (i%2==0?1:-1) * Date.now() * 0.0001 + PRNG.random() * Math.PI * 2;
    v = [
      Math.cos(a) * r,
      Math.sin(a) * r
    ];
    vertices.unshift(v);

    for(var j = 0; j < spawn * (.5 + PRNG.random()); j++) {
      r = PRNG.random() * offset;
      a = (j%2==0?1:-1) * Date.now() * 0.0002 + PRNG.random() * Math.PI * 2;
      o = vertices[ 0 ];
      v = [
        o[0] + Math.cos(a % r) * r ,
        o[1] + Math.sin(a % r * 2) * r
      ];
      vertices.push(v);
    }
  }

  ctx.restore();
  ctx.save();

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  ctx.globalAlpha = 1;
  ctx.fillStyle = `${blob.bg}`;
  ctx.fillRect(0,0, canvas.width, canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);

  ctx.strokeStyle = `${blob.stroke}`;
  var m = size/8;
  for(i = 8; i <= m; i *= 2) {
    ctx.globalAlpha = (1 - i/m) * .1;
    yolo(vertices, i, size, size);
  }
  requestAnimationFrame(update);
}


function yolo(vertices, size, _w, _h) {
  //measures of an equalateral  triangle
  const sides = 3;
  var l =	2 * Math.sin(Math.PI / sides); //side length
  var a = l / (2 * Math.tan(Math.PI / sides)); //apothem
  var h = (1 + a); //radius + apothem

  size = size || 1;
  l *= size;
  h *= size;

  var mx = 2 * Math.ceil(_w / l);
  var my = Math.ceil(_h / h);

  var fills = [];
  ctx.beginPath();
  vertices.forEach(function(v) {
    var cell_x = Math.round(norm(v[0], 0, _w) * mx);
    var cell_y = Math.round(norm(v[1], 0, _h) * my);

    var md = Number.POSITIVE_INFINITY, d, x, y, ix, iy, ps = [];
    for(var i = cell_x - 2; i < cell_x + 2; i++) {
      for(var j = cell_y - 2; j < cell_y + 2; j++) {
        if((Math.abs(i) % 2 == 1 && Math.abs(j) % 2 == 0)
          ||  (Math.abs(i) % 4 == 0 && Math.abs(j) % 2 == 1)) {
          ix = (i) * l/2;
          iy = (j) * h;
          d = squareDistance([ix,iy], v);
          if(d < md) {
            md = d;
            x = (i) * l/2;
            y = (j) * h;
            ps.unshift(x, y);
          }
        }
      }
    }

    if(PRNG.random() > 0.5) {
      ctx.moveTo(v[0], v[1]);
      ctx.lineTo(ps[0], ps[1]);
    } else {
      ctx.moveTo(ps[0], ps[1]);
      ctx.lineTo(ps[2], ps[3]);
      if(PRNG.random() > blob.fills) {
        fills.push(ps);
      }
    }
  });
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = `${blob.fg}`;
  fills.forEach(function(ps) {
    ctx.moveTo(ps[0], ps[1]);
    ctx.lineTo(ps[2], ps[3]);
    ctx.lineTo(ps[4], ps[5]);
    ctx.lineTo(ps[0], ps[1]);
  });
  ctx.fill();
}

update();
