﻿
// Mecho 4.10
// CC-3.0-SA-NC
//
//
// new Matrix()
//		identity()
//		rotateXZ(a) - angle in degrees
//		rotateXY(a) - angle in degrees
//		rotateYZ(a) - angle in degrees
//		translate(v)
//		untranslate(v) = translate(-v)
//		scale(s)
//
// Suica
//		Suica.version
//		{Suica.}random(<from>,<to>)
//		{Suica.}radians(<degrees>)
//		{Suica.}unitVector(<vector>)
//		{Suica.}vectorProduct(<vector>,<vector>)
//		{Suica.}scalarProduct(<vector>,<vector>)
//		{Suica.}vectorPoints(<vector-point>,<vector-point>)
//		{Suica.}sameAs(<object>)
//		{Suica.}sameAs(<array>)
//		{Suica.}getPosition(<vector>)
//		{Suica.}startTraceDraw(zScale)
//		{Suica.}endTraceDraw()
//		{Suica.}view
//		optimize
//
// mainAnimationLoop()
//
// {<scene> =} new Mecho(<canvas-id>)
//		{<scene>.}background = <color>						default:[1,1,1]
//		{<scene>.}lookAt(<eye>,<target>,<up>)				default:[100,100,30],[0,0,0],[0,0,1]
//		{<scene>.}perspective(<angle>,<near>,<far>)		default:30,1,40000
//		{<scene>.}orthographic(<near>,<far>)
//		
// Viewpoint(<context>)
//		rotate(dX,dY)
//		pan(dX,dY)
//		recalculate()
//		distance
//		alpha
//		beta
//		eye
//		target
//		up
//===================================================
//
// SUICA SHADERS
//
//===================================================

var vsSource = 
'	uniform mat4 uProjectionMatrix;	'+
'	uniform mat4 uViewMatrix;		'+
'	uniform mat4 uModelMatrix;		'+
'	uniform vec3 uScale;			'+
'	uniform vec3 uPos;				'+
'	uniform vec4 uRr;				'+
'	uniform bool uLight;			'+
'	uniform bool uSharpCone;		'+
'	attribute vec3 aXYZ;			'+
'	varying   vec2 vXY;				'+
'	varying   vec3 vPos;			'+
'	varying   float vZ;				'+
'	attribute vec3 aNormal;			'+
'	varying   vec3 vNormal;			'+
'	attribute vec2 aTexCoord;		'+
'	varying   vec2 vTexCoord;		'+
'	varying   float vDepth;			'+
'	void main ()					'+
'	{								'+
'		mat4 mvMatrix = uViewMatrix * uModelMatrix;'+
'		if (uLight) 				'+
'		{							'+
'			vec3 normal = aNormal;'+
'			if (aXYZ.z<0.5 || uSharpCone) normal =vec3(uRr.z,uRr.z,1)*normal+vec3(0,0,uRr.w);'+
'			vNormal = normalize(mat3(mvMatrix)*normal); 	'+
'		}							'+
'		vTexCoord = aTexCoord; '+
'		vec3 cone = vec3(vec2((uRr.y-uRr.x)*aXYZ.z+uRr.x),1);'+
'		vec4 pos = mvMatrix * vec4(aXYZ*uScale*cone+uPos,1);'+
'		gl_Position = uProjectionMatrix * pos;	'+
'		vPos = pos.xyz/pos.w;'+
'		vXY = aXYZ.xy;'+
'		vDepth = gl_Position.w;'+
'		vZ = (uModelMatrix * vec4(aXYZ*uScale*cone+uPos,1)).z;'+
'	}								';

var fsSource =	
'	uniform sampler2D uSampler; 	'+
'	precision mediump float;		'+
'	uniform bool uLight;			'+
'	uniform bool uTexture;			'+
'	uniform vec2 uTexScale;			'+
'	uniform float uTeeth;			'+
'	uniform vec3 uColor;			'+
'	uniform vec3 uBackground;		'+
'	uniform float uGears;			'+
'	uniform float uClip;			'+
'	uniform float uShininess;		'+
'	uniform float uReflection;		'+
'	uniform float uTransparancy;	'+
'	uniform float uFog;				'+
'	varying vec3 vNormal;			'+
'	varying vec2 vTexCoord;			'+
'	varying vec3 vPos;				'+
'	varying vec2 vXY;				'+
'	varying float vDepth;			'+
'	varying float vZ;				'+
'	const float PI = 3.1415926535897932384626433832795;'+
'	void main( )					'+
'	{								'+
'		if (uClip*vZ<0.0) discard;/*2019*/'+
'		vec3 normal = vNormal;'+
'		vec3 viewDir = normalize(vPos);'+

'		vec3 light = vec3(0,0,1);'+

'		vec3 reflectedLight = normalize(reflect(light,normal));'+
'		float cosa = max(dot(reflectedLight,viewDir),0.0);'+
'		vec3 specularColor = vec3(uReflection*pow(cosa,uShininess));'+

'		float m = (cosa+0.05)*uTeeth*(sin(uGears*atan(vXY.y,vXY.x)));'+

'		vec4 color = vec4(uColor,1.0);									'+
'		if (uTexture)													'+
'			color = color * texture2D(uSampler,vTexCoord*uTexScale);'+
'		float diffLight = uLight? (normal.z>0.0?normal.z:-0.1*normal.z):1.0;'+
'		diffLight=pow(max(diffLight,0.075),0.25)+m;'+
'		float k = uFog*smoothstep(0.0,160.0,vDepth);'+
'		gl_FragColor = vec4(mix(diffLight*color.rgb+specularColor,uBackground,k),uTransparancy);			'+
'	}																	';


var vsSourceSelect = 
'	uniform mat4 uProjectionMatrix;	'+
'	uniform mat4 uViewMatrix;		'+
'	uniform mat4 uModelMatrix;		'+
'	attribute vec3 aXYZ;			'+
'	void main ()					'+
'	{								'+
'		gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aXYZ,1);	'+
'	}								';

var fsSourceSelect =	
'	precision mediump float;	'+
'	uniform vec3 uColor;		'+
'	void main( )				'+
'	{							'+
'		gl_FragColor = vec4(uColor,1.0);'+
'	}							';


//===================================================
//
// SUICA OBJECT
//
//===================================================


var Mecho = function( canvasId )
{
	// check uri for 'file' only if localImages does not exis
	if (!Mecho.localImages)
	if (document.documentURI.substring(0,4)=='file')
	{
		var div = document.createElement('div');
		document.body.appendChild(div);
		div.className = 'mechoerror';
		div.innerHTML = 'ВНИМАНИЕ: Вероятно примерът е стартиран локално. Декорациите може да не се покажат.';
	}


	// if no canvasId - use the first canvas
	if (!canvasId)
	{
		var cvx;
		var cvxs = document.getElementsByTagName('canvas');
		if (!cvxs.length)
		{	// no canvas? create one
			cvx = document.createElement('canvas');
			document.body.appendChild(cvx);
			cvx.width = window.innerWidth;
			cvx.height = window.innerHeight;
			cvx.className = 'mechocanvas';
		}
		else
			cvx = cvxs[0];
		
		// if no Id, create id
		if (!cvx.id) cvx.id = 'suica_canvas';

		canvasId = cvx.id;
	}
	this.gl = Mecho.getContext(canvasId,{
				//preserveDrawingBuffer: true,
				premultipliedAlpha: false,
				antialias: true,
				alpha: false,
			});

	this.shaderProgram = Mecho.getProgram(this.gl,vsSource,fsSource);
	this.shaderProgramSelect = Mecho.getProgram(this.gl,vsSourceSelect,fsSourceSelect);

	var that = this;
	this.mouseButton = 0;
	this.gl.canvas.addEventListener('mousedown',function(e){that.mouseDown(e);},false);
	this.gl.canvas.addEventListener('mousemove',function(e){that.mouseMove(e);},false);
	this.gl.canvas.addEventListener('mouseup',  function(e){that.mouseUp(e);},false);
	this.gl.canvas.addEventListener('mouseleave',  function(e){that.mouseUp(e);},false);
	this.gl.canvas.addEventListener('contextmenu',function(e){e.preventDefault();},false);
	window.addEventListener('keydown',function(e){that.keyDown(e);},false);
	window.addEventListener('keyup',function(e){that.keyUp(e);},false);

	this.viewObject = new Mecho.Viewpoint(this);
	
	this.viewMatrix = this.identityMatrix();
	this.modelMatrix = this.identityMatrix();
	this.projectionMatrix = this.identityMatrix();

	this.useShader(this.shaderProgram);

	this.gl.enable(this.gl.DEPTH_TEST);
	this.gl.enableVertexAttribArray(this.aXYZ);
	this.gl.disable(this.gl.CULL_FACE);
	this.gl.cullFace(this.gl.BACK);
	this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

	this.gl.uniform1f(this.uTeeth,0);
	this.gl.uniform3f(this.uScale,1,1,1);
	this.gl.uniform3f(this.uPos,0,0,0);
	this.gl.uniform4f(this.uRr,1,1,1,0);
	this.gl.uniform1i(this.uSharpCone,false);

	this.modelMatrixStack = [];
	this.normalMatrix = new Float32Array(9);

	this.perspective(30,0.5,1000);

	this.backgroundColor = [1,1,1];

	this.onTime = null;
	
	Mecho.contextList.push(this);
	Mecho.lastContext = this;

	this.defineGeometries();

	this.mecholetList = [];	// local list of all context objects
	this.traceletList = [];	// local list of all context traces
	this.groundObject = new Mecho.Ground();
	this.tagetObject = undefined;//new Mecho.Target();
	this.optimize = false;
	
	this.sky = Mecho.WHITE;
	this.ground = Mecho.TILE;
	
	// create buttons pannel
	this.buttons = 0;
	this.buttonList = [];
	this.panel = document.createElement('div');
	this.panel.className = 'mechopanel';
	this.panel.setAttribute('active','true');
	document.body.appendChild(this.panel);
}

// switch shaders
Mecho.prototype.useShader = function(shader)
{

	var gl = this.gl;
	var glprog = this.shaderProgram;
	for (var i=0; i<gl.getProgramParameter(glprog,gl.ACTIVE_UNIFORMS); i++)
	{
		var name = gl.getActiveUniform(glprog,i).name;
		this[name] = gl.getUniformLocation(glprog,name);
	}

	for (var i=0; i<gl.getProgramParameter(glprog,gl.ACTIVE_ATTRIBUTES); i++)
	{
		var name = gl.getActiveAttrib(glprog,i).name;
		this[name] = gl.getAttribLocation(glprog,name);
	}

	this.gl.useProgram(shader);
	this.gl.uniformMatrix4fv(this.uProjectionMatrix,false,this.projectionMatrix);
	this.gl.uniformMatrix4fv(this.uViewMatrix,false,this.viewMatrix);
	this.gl.uniformMatrix4fv(this.uModelMatrix,false,this.modelMatrix);

	if (shader==this.shaderProgram)
	{
		Mecho.normalRender = true;
	}

	if (shader==this.shaderProgramSelect)
	{
		if (this.aTexCoord) this.gl.disableVertexAttribArray(this.aTexCoord);
		if (this.aNormal) this.gl.disableVertexAttribArray(this.aNormal);
		Mecho.normalRender = false;
	}
}

Mecho.contextList = [];	// global list of all SUICA contexts
Mecho.lastContext = null;
Mecho.startTime = (new Date()).getTime(); // SUICA start time (in ms)
Mecho.time = 0;
Mecho.dTime = 0;
Mecho.FLOATS = Float32Array.BYTES_PER_ELEMENT; // should be 4

Mecho.normalRender = true; // false = render for object selection

Mecho.X = 0;
Mecho.Y = 1;
Mecho.Z = 2;
Mecho.T = 3;

Mecho.POINT = 1;
Mecho.LINE = 2;
Mecho.SOLID = 3;
Mecho.ALL = 4;
Mecho.NONPOINT = 5;

Mecho.PRECISION = 48;
Mecho.id = 0;

Mecho.getContext = function(canvasId,options)
{
	var canvas = document.getElementById(canvasId);
	if (!canvas)
	{
		alert('Не е намерен елемент canvas с id='+canvasId+' [getContext]');
		return null;
	}
	canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();},false);
	canvas.addEventListener('webglcontextrestored',function(event){console.log('Boo!');},false);

	var context = canvas.getContext('webgl',options) || canvas.getContext('experimental-webgl',options);
	if (!context)
	{
		alert('Не е създаден графичен контекст [getContext]');
	}
	
	return context;
}


Mecho.getShader = function(gl,source,type)
{
	var shader = gl.createShader(type);

	gl.shaderSource(shader,source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
	{
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	
	return shader;
}


Mecho.getProgram = function(gl,vsSource,fsSource)
{
	var vShader = Mecho.getShader(gl,vsSource,gl.VERTEX_SHADER);
	var fShader = Mecho.getShader(gl,fsSource,gl.FRAGMENT_SHADER);

	if (!vShader || !fShader) {return null;}
	
	var shaderProgram = gl.createProgram();
	gl.bindAttribLocation(shaderProgram,0,"aXYZ");

	gl.attachShader(shaderProgram,vShader);
	gl.attachShader(shaderProgram,fShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS))
	{
		alert(gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	return shaderProgram;
}


Mecho.prototype.perspective = function(angle,near,far)
{
	var aspect = this.gl.canvas.clientWidth/this.gl.canvas.clientHeight;
	var fov = 1/Math.tan(radians(angle)/2);
	this.projectionMatrix = new Float32Array([
		fov/aspect, 0, 0, 0,
		0, fov, 0, 0,
		0, 0, (far+near)/(near-far), -1,
		0, 0, 2.0*near*far/(near-far), 0]);
	this.gl.uniformMatrix4fv(this.uProjectionMatrix,false,this.projectionMatrix);
}

function perspective(angle,near,far)
{
	if (Mecho.lastContext) Mecho.lastContext.perspective(angle,near,far);
}


Mecho.prototype.lookAt = function(eye,target,up)
{
	this.viewObject.target = target;
	this.viewObject.eye = eye;
	this.viewObject.up = up;
}


function lookAt(eye,target,up)
{
	if (Mecho.lastContext) Mecho.lastContext.lookAt(eye,target,up);
}


Object.defineProperty(Mecho.prototype,'sky',
{
	get: function()  {return this.backgroundColor;},
	set: function(a)
		{
			a = a.color||a;
			this.backgroundColor=a;
			this.gl.uniform3fv(this.uBackground,a);
		}
});

Object.defineProperty(Mecho.prototype,'ground',
{
	get: function()  {return this.groundObject.material;},
	set: function(a)
		{
			this.groundObject.material=a;
		}
});

Mecho.prototype.identityMatrix = function()
{
	return new Float32Array( [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] );
}
	

Mecho.prototype.matrixMultiply = function(a,b)
{
	var res=[];
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    res[0] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[1] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[2] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[3] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    res[4] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[5] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[6] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[7] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    res[8] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[9] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[10] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[11] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    res[12] = b0*a[0] + b1*a[4] + b2*a[8] + b3*a[12];
    res[13] = b0*a[1] + b1*a[5] + b2*a[9] + b3*a[13];
    res[14] = b0*a[2] + b1*a[6] + b2*a[10] + b3*a[14];
    res[15] = b0*a[3] + b1*a[7] + b2*a[11] + b3*a[15];
    return res;
};

Mecho.prototype.transposeInverse = function()
{
	var a = this.matrixMultiply(this.viewMatrix,this.modelMatrix);
	
    var b00 =  a[0]*a[5]  -  a[1]*a[4],
        b01 =  a[0]*a[6]  -  a[2]*a[4],
        b02 =  a[0]*a[7]  -  a[3]*a[4],
        b03 =  a[1]*a[6]  -  a[2]*a[5],
        b04 =  a[1]*a[7]  -  a[3]*a[5],
        b05 =  a[2]*a[7]  -  a[3]*a[6],
        b06 =  a[8]*a[13] -  a[9]*a[12],
        b07 =  a[8]*a[14] - a[10]*a[12],
        b08 =  a[8]*a[15] - a[11]*a[12],
        b09 =  a[9]*a[14] - a[10]*a[13],
        b10 =  a[9]*a[15] - a[11]*a[13],
        b11 = a[10]*a[15] - a[11]*a[14],
        det = 1/(b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);

	this.normalMatrix[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
    this.normalMatrix[1] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det;
    this.normalMatrix[2] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det;

    this.normalMatrix[3] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
    this.normalMatrix[4] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
    this.normalMatrix[5] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;

    this.normalMatrix[6] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
    this.normalMatrix[7] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det;
    this.normalMatrix[8] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
	
};

Mecho.prototype.cloneMatrix = function(a)
{
	var b = new Float32Array(a.length);
	b.set(a);
	return b;
}


Mecho.prototype.pushMatrix = function()
{
	this.modelMatrixStack.push(this.cloneMatrix(this.modelMatrix));
}


Mecho.prototype.popMatrix = function()
{
	if (this.modelMatrix.length)
		this.modelMatrix = this.modelMatrixStack.pop();
	else
		identity();
}


Mecho.prototype.redrawFrame = function()
{
	this.gl.clearColor(this.backgroundColor[0],this.backgroundColor[1],this.backgroundColor[2],1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT+this.gl.DEPTH_BUFFER_BIT);
	if (this.onTime) this.onTime();
}

Mecho.prototype.objectAtPoint = function(x,y)
{
	var rec = this.gl.canvas.getBoundingClientRect();
	
	this.useShader(this.shaderProgramSelect);
	
	// redraw all elements
	this.gl.clearColor(1,1,1,1);
	this.gl.clear(this.gl.COLOR_BUFFER_BIT+this.gl.DEPTH_BUFFER_BIT);
	for (var i=0; i<this.mecholetList.length; i++)
		this.mecholetList[i].drawObject();

	var pixelValues = new Uint8Array(4);//*2*2);
	this.gl.readPixels(	x-rec.left, rec.bottom-y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixelValues);

	var id = pixelValues[0]+(pixelValues[1]<<8)+(pixelValues[2]<<16); 

	var foundObject = null;
	if (id<=Mecho.id)
	{
		for (var i=0; i<this.mecholetList.length; i++)
			if (this.mecholetList[i].interactive)
				if (this.mecholetList[i].id==id)
					{	// maybe object [i] is the correct? we may get wrong result because
						// of antialiasing, so check again, but draw only the suspected object
						this.gl.clearColor(1,1,1,1);
						this.gl.clear(this.gl.COLOR_BUFFER_BIT+this.gl.DEPTH_BUFFER_BIT);
						this.mecholetList[i].drawObject();
						this.gl.readPixels(	x-rec.left, rec.bottom-y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixelValues);
						var checkedId = pixelValues[0]+(pixelValues[1]<<8)+(pixelValues[2]<<16); 
						if (id==checkedId)
						{	// Yes!!!
							foundObject=this.mecholetList[i];
							break;
						}
					}
	}
	
	this.useShader(this.shaderProgram);
	return foundObject;
}

Mecho.prototype.getPosition = function(center)
{
	var m = this.matrixMultiply(this.projectionMatrix,this.viewMatrix);
	var c = center;
	var x = m[0]*c[0]+m[4]*c[1]+m[8]*c[2]+m[12];
	var y = m[1]*c[0]+m[5]*c[1]+m[9]*c[2]+m[13];
	var w = m[3]*c[0]+m[7]*c[1]+m[11]*c[2]+m[15];

	var p = this.gl.canvas;
	var br = p.getBoundingClientRect();
	x = x*p.width/w/2;
	y = y*p.height/w/2;
	return [br.left+x+p.width/2+Mecho.scrollLeft(), br.top-y+p.height/2+Mecho.scrollTop()];
}

function getPosition(center)
{
	if (Mecho.lastContext) return Mecho.lastContext.getPosition(center);
}

Mecho.prototype.startTraceDraw = function(zScale)
{
	var gl = this.gl;
	this.pushMatrix();
	var mat = this.identityMatrix();
	gl.uniformMatrix4fv(this.uModelMatrix,false,mat);

	gl.uniform1i(this.uLight,false);
	gl.enableVertexAttribArray(this.aXYZ);
	gl.disableVertexAttribArray(this.aNormal);
	gl.disableVertexAttribArray(this.aTexCoord);
	gl.uniform1f(this.uReflection,0);
	gl.uniform1f(this.uShininess,1);
	gl.uniform3f(this.uScale,1,1,zScale);
	gl.uniform3f(this.uPos,0,0,0);
	gl.bindTexture(gl.TEXTURE_2D,null);
	gl.uniform1i(this.uTexture,false);
}
Mecho.prototype.endTraceDraw = function()
{
	this.popMatrix();
}

Mecho.prototype.mouseDown = function(event)
{
	this.gl.canvas.style.cursor = 'move';
	this.mouseButton = event.which;
	this.mousePos = [event.clientX,event.clientY];
	if (this.targetObject && !this.viewObject.follow)
	{
		this.targetObject.visible = true;
		this.targetObject.center = this.viewObject.target;
	}
}


Mecho.prototype.mouseUp = function(event)
{
	this.gl.canvas.style.cursor = 'auto';
	this.panel.setAttribute('active','true');
	//this.panel.style.display = 'block';
	this.mouseButton = 0;
	if (this.targetObject)
		this.targetObject.visible = false;
}

Mecho.prototype.mouseClick = function(event,elem)
{
	if (!elem) return;
	
	//process clicks on buttons
	if (elem.nextState) elem.nextState();
	if (elem.handler) elem.handler();
}

Mecho.keysDown = [];
Mecho.prototype.keyUp = function(event)
{
	Mecho.keysDown[event.keyCode]=false;
	if (this.targetObject)
		this.targetObject.visible = false;
}
Mecho.prototype.keyDown = function(event)
{
	Mecho.keysDown[event.keyCode]=true;

	var done = false;
	for (var elem = this.panel.firstChild; elem; elem=elem.nextSibling)
	{
		if( elem.button.key==event.keyCode )
		{
			if (elem.button.nextState) elem.button.nextState();
			if (elem.button.handler) elem.button.handler();
			done = true;
		}
	}
	if (done) return;
	
	// key navigation
	if (event.keyCode==Mecho.KEYS.LEFT)
		this.viewObject.rotate(-10,0);
	if (event.keyCode==Mecho.KEYS.RIGHT)
		this.viewObject.rotate(+10,0);
	if (event.keyCode==Mecho.KEYS.UP)
		this.viewObject.rotate(0,+5);
	if (event.keyCode==Mecho.KEYS.DOWN)
		this.viewObject.rotate(0,-5);
	if (this.targetObject && !this.viewObject.follow)
		if (event.keyCode==Mecho.KEYS.LEFT || event.keyCode==Mecho.KEYS.RIGHT || event.keyCode==Mecho.KEYS.UP || event.keyCode==Mecho.KEYS.DOWN)
		{
			this.targetObject.visible = true;
			this.targetObject.center = this.viewObject.target;
		}
}

Mecho.prototype.mouseMove = function(event)
{
	//this.mouseButton = event.which;
	if (!this.mouseButton) return;
	this.panel.setAttribute('active','false');
	//this.panel.style.display = 'none';
	var dX = event.clientX-this.mousePos[0];
	var dY = -event.clientY+this.mousePos[1];
	
	// left button - rotation
	if (this.mouseButton==1)
	{
		this.viewObject.rotate(dX,dY);
	}
	
	// right button - panning
	if (this.mouseButton==3)
	{
		this.viewObject.pan(dX,dY);
	}
	
	this.mousePos = [event.clientX,event.clientY];
}

function mainAnimationLoop()
{
	var time = new Date();
	time = (time.getTime()-Mecho.startTime)/1000; // milliseconds->seconds
	Mecho.dTime = time-Mecho.time;
	Mecho.time = time;
	
	// update objects from all suicas
	for (var s=0; s<Mecho.contextList.length; s++)
	{
		Mecho.contextList[s].redrawFrame(time);
	}
	
	// draw objects from all suicas
	for (var s=0; s<Mecho.contextList.length; s++)
	{
		var ctx = Mecho.contextList[s];
		var gl = ctx.gl;
		
		function drawMecholets()
		{
			for (var i=0; i<ctx.mecholetList.length; i++)
				ctx.mecholetList[i].draw();
		}

		function drawTraces(mirror)
		{	// mirror=1 draw above ground, -1 below ground
			ctx.startTraceDraw(mirror);
			for (var i=0; i<ctx.traceletList.length; i++)
				ctx.traceletList[i].draw();
			ctx.endTraceDraw();
		}

		function mirrorMatrix()
		{
			ctx.modelMatrix[8] *= -1;
			ctx.modelMatrix[9] *= -1;
			ctx.modelMatrix[10] *= -1;
		}
		
		gl.uniform1f(ctx.uClip,0);
		if (ctx.groundObject && ctx.groundObject.visible)
		{
			gl.uniform1f(ctx.uTransparancy,1);
			gl.uniform1f(ctx.uFog,1);
			ctx.groundObject.draw();
			gl.uniform1f(ctx.uFog,0.9);

			/* 2019.10.15: set to FALSE if "discard" in the
			   fragment shader cannot be translated to Direct3D,
			   this also removes the mirror image is removed */
			if (true)
			{
				gl.clear(gl.DEPTH_BUFFER_BIT);
				
				// draw mirror objects (reflections)
				gl.uniform1f(ctx.uClip,-1);
				mirrorMatrix();
				drawMecholets();
				drawTraces(-1);
				mirrorMatrix();

				gl.uniform1f(ctx.uTransparancy,ctx.groundObject.material[0].groundReflection);
				gl.enable(gl.BLEND);
				gl.uniform1f(ctx.uFog,1);
				ctx.groundObject.draw();
				gl.uniform1f(ctx.uFog,0.9);
				gl.uniform1f(ctx.uTransparancy,1);
				gl.disable(gl.BLEND);
			}
			// next (outside the IF) draw normal objects above the ground
			gl.uniform1f(ctx.uClip,1);
		}

		if (ctx.targetObject && ctx.targetObject.visible)
		{
			var k = 0.9*(1-Mecho.dTime);
			var cen = [0,0,0];
			for (var i=0; i<3; i++)
				cen[i] = ctx.targetObject.center[i]*k+(1-k)*ctx.viewObject.target[i];
			ctx.targetObject.center = cen;
			ctx.targetObject.draw();
		}
		drawMecholets();
		drawTraces(1);

		ctx.viewObject.recalculate();
	}
	
	requestAnimationFrame(mainAnimationLoop);
}

Mecho.random = function(a,b)
{
	return a+(b-a)*Math.random();
}


Mecho.radians = function(degrees)
{
	return degrees*Math.PI/180;
}


Mecho.N = function(x)
{
	x = Math.round(x);
	if (x<1) x=1;
	return x;
}


Mecho.unitVector = function(x)
{
	var len = 1/Math.sqrt( x[0]*x[0]+x[1]*x[1]+x[2]*x[2] );
	return [ len*x[0], len*x[1], len*x[2] ];
}


Mecho.vectorProduct = function(x,y)
{
	return [
		x[1]*y[2]-x[2]*y[1],
		x[2]*y[0]-x[0]*y[2],
		x[0]*y[1]-x[1]*y[0] ];
}


Mecho.scalarProduct = function(x,y)
{
	return x[0]*y[0] + x[1]*y[1] + x[2]*y[2];
}


Mecho.vectorPoints = function(x,y)
{
	return [ x[0]-y[0], x[1]-y[1], x[2]-y[2] ];
}


Mecho.sameAs = function(obj)
{
	if (obj instanceof Array)
	{
		return obj.slice(0);
	}
	else
	{
		var result={};
		for(var n in obj) result[n]=obj[n];
		obj.ctx.mecholetList.push(result);
		return result;
	}
}

Mecho.scrollLeft = function() {
	return Math.max (
		window.pageXOffset ? window.pageXOffset : 0,
		document.documentElement ? document.documentElement.scrollLeft : 0,
		document.body ? document.body.scrollLeft : 0
	);
}

Mecho.scrollTop = function() {
	return Math.max (
		window.pageYOffset ? window.pageYOffset : 0,
		document.documentElement ? document.documentElement.scrollTop : 0,
		document.body ? document.body.scrollTop : 0
	);
}


//===================================================
//
// new Matrix()
//		identity()
//		rotateXZ(a) - angle in degrees
//		rotateXY(a) - angle in degrees
//		rotateYZ(a) - angle in degrees
//		translate(v)
//		untranslate(v) = translate(-v)
//		scale(s)
//
//===================================================

Mecho.Matrix = function()
{
	this.identity();
}


Mecho.Matrix.prototype.identity = function()
{
	this.matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
}


Mecho.Matrix.prototype.rotateXZ = function(a)
{
	a = radians(a);
	var s = Math.sin(a), c = Math.cos(a);
	var m = this.matrix;
	
	a = m[0]*s+m[ 8]*c; m[0]=m[0]*c-m[ 8]*s; m[ 8]=a;
	a = m[1]*s+m[ 9]*c; m[1]=m[1]*c-m[ 9]*s; m[ 9]=a;
	a = m[2]*s+m[10]*c; m[2]=m[2]*c-m[10]*s; m[10]=a;
}


Mecho.Matrix.prototype.rotateXY = function(a)
{
	a = radians(a);
	var s = Math.sin(a), c = Math.cos(a);
	var m = this.matrix;
	
	a = m[0]*s+m[4]*c; m[0]=m[0]*c-m[4]*s; m[4]=a;
	a = m[1]*s+m[5]*c; m[1]=m[1]*c-m[5]*s; m[5]=a;
	a = m[2]*s+m[6]*c; m[2]=m[2]*c-m[6]*s; m[6]=a;
}


Mecho.Matrix.prototype.rotateYZ = function(a)
{
	a = radians(a);
	var s = Math.sin(a), c = Math.cos(a);
	var m = this.matrix;
	
	a = m[4]*s+m[ 8]*c; m[4]=m[4]*c-m[ 8]*s; m[ 8]=a;
	a = m[5]*s+m[ 9]*c; m[5]=m[5]*c-m[ 9]*s; m[ 9]=a;
	a = m[6]*s+m[10]*c; m[6]=m[6]*c-m[10]*s; m[10]=a;
}


Mecho.Matrix.prototype.translate = function(v)
{
	var m = this.matrix;

	m[12] += m[0]*v[0]+m[4]*v[1]+m[8]*v[2];
	m[13] += m[1]*v[0]+m[5]*v[1]+m[9]*v[2];
	m[14] += m[2]*v[0]+m[6]*v[1]+m[10]*v[2];
}


Mecho.Matrix.prototype.untranslate = function(v)
{
	var m = this.matrix;

	m[12] -= m[0]*v[0]+m[4]*v[1]+m[8]*v[2];
	m[13] -= m[1]*v[0]+m[5]*v[1]+m[9]*v[2];
	m[14] -= m[2]*v[0]+m[6]*v[1]+m[10]*v[2];
}


Mecho.Matrix.prototype.scale = function(s)
{
	var m = this.matrix;

	m[0] *= s[0]; m[1] *= s[0];	m[2] *= s[0];
	m[4] *= s[1]; m[5] *= s[1];	m[6] *= s[1];
	m[8] *= s[2]; m[9] *= s[2]; m[10]*= s[2];
}


Mecho.Matrix.prototype.mirror = function(s)
{
	var m = this.matrix;

	m[8] *= -1; m[9] *= -1; m[10]*= -1;
}

Mecho.Matrix.prototype.point = function(v)
{
	var m = this.matrix;

	var x = m[12]+m[0]*v[0]+m[4]*v[1]+m[8]*v[2];
	var y = m[13]+m[1]*v[0]+m[5]*v[1]+m[9]*v[2];
	var z = m[14]+m[2]*v[0]+m[6]*v[1]+m[10]*v[2];
	return [x,y,z];
}

//===================================================
//
// new Viewpoint()
//
//===================================================
Mecho.Viewpoint = function(ctx)
{
	this.ctx = ctx;
	this.mDistance = 30;
	this.mAlpha = 3.14;
	this.dAlpha = 0;
	this.mBeta = 0.3;
	this.dBeta = 0;
	this.mEye = [0,0,0];
	this.mTarget = [0,0,3];
	this.mUp = [0,0,1];
	this.dirtyA = true; // distance, alpha or beta
	this.dirtyP = true; // eye, target or up
	this.follow = undefined;
}

Mecho.Viewpoint.prototype.rotate = function(dX,dY)
{
	this.dAlpha = dX;
	this.dBeta = dY;
	this.alpha += this.dAlpha/250;
	this.beta -= this.dBeta/200;
	if (this.beta>1.57) this.beta=1.57;
	if (this.beta<-1.57) this.beta=-1.57;
}

Mecho.Viewpoint.prototype.pan = function(dX,dY)
{
	var x = this.target[0];
	var y = this.target[1];
	var z = this.target[2];
	
	if (abs(dY)>abs(dX))
	{
		var posZ = Math.sign(z+this.distance*sin(this.beta));
		x += posZ*dY*sin(this.alpha)/(30-20*cos(this.beta));
		y += posZ*dY*cos(this.alpha)/(30-20*cos(this.beta));
	}
	else
	{
		x += dX*cos(this.alpha)/30;
		y -= dX*sin(this.alpha)/30;
	}
	this.target = [x,y,z];
	
	// because the eye position must be recalculated
	this.dirtyA = true;
}

Mecho.Viewpoint.prototype.recalculate = function()
{
	// if automatic following is on, then change target
	var follow = this.follow;
	if (follow && follow.center)
	{
		var k = 0.9;
		this.dirtyA = true;
		this.target[0] = this.target[0]*k+(1-k)*follow.center[0];
		this.target[1] = this.target[1]*k+(1-k)*follow.center[1];
		this.target[2] = this.target[2]*k+(1-k)*follow.center[2];
	}
	
	if (Mecho.keysDown[Mecho.KEYS.LEFT] ||
		Mecho.keysDown[Mecho.KEYS.RIGHT] ||
		Mecho.keysDown[Mecho.KEYS.UP] ||
		Mecho.keysDown[Mecho.KEYS.DOWN] )
	{
		this.rotate(this.dAlpha,this.dBeta);
		this.dirtyA = true;
	} else
	if (Math.abs(this.dAlpha)>0.001 | Math.abs(this.dBeta)>0.001)
	{
		var kx=1-5*Mecho.dTime;
		var ky=1-10*Mecho.dTime;
		this.rotate(kx*this.dAlpha,ky*this.dBeta);
		this.dirtyA = true;
	}
//	console.log(this.dAlpha,this.dBeta);
	
	// if the spherical view point is changed (i.e. distance,
	// alpha or beta) then recalculate new cartesian view
	// point (i.e. eye, target and up vectors)
	if (this.dirtyA)
	{
		this.dirtyA = false;

		var posZ = this.target[2]+this.distance*sin(this.beta);
		if (this.ctx.groundObject && this.ctx.groundObject.visible)
		{
			var MIN_POS_Z = 0.2;
			if (posZ<MIN_POS_Z)
			{
				this.beta = Math.asin((MIN_POS_Z-this.target[2])/this.distance);
				posZ = MIN_POS_Z;
			}
		}
		
		this.eye = [ this.target[0]+this.distance*sin(this.alpha)*cos(this.beta),
					 this.target[1]+this.distance*cos(this.alpha)*cos(this.beta),
					 posZ ];
	}
	
	// if the cartesian view point is changed (i.e. eye,
	// target and up vectors), then recalculate the view
	// matrix and send it to the shader
	if (this.dirtyP)
	{
		this.dirtyP = false;
		var z = Mecho.unitVector(Mecho.vectorPoints(this.eye,this.target));
		var x = Mecho.unitVector(Mecho.vectorProduct(this.up,z));
		var y = Mecho.unitVector(Mecho.vectorProduct(z,x));
		this.ctx.viewMatrix = new Float32Array([
			x[0], y[0], z[0], 0,
			x[1], y[1], z[1], 0,
			x[2], y[2], z[2], 0,
			-Mecho.scalarProduct(x,this.mEye),
			-Mecho.scalarProduct(y,this.mEye),
			-Mecho.scalarProduct(z,this.mEye), 1 ]);
		this.ctx.gl.uniformMatrix4fv(this.ctx.uViewMatrix,false,this.ctx.viewMatrix);
	}
}

Object.defineProperty(Mecho.Viewpoint.prototype,'distance',
{
	get: function()  {return this.mDistance;},
	set: function(a) {this.mDistance=a; this.dirtyA=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'alpha',
{
	get: function()  {return this.mAlpha;},
	set: function(a) {this.mAlpha=a; this.dirtyA=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'beta',
{
	get: function()  {return this.mBeta;},
	set: function(a) {this.mBeta=a; this.dirtyA=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'eye',
{
	get: function()  {return this.mEye;},
	set: function(a) {this.mEye=a; this.dirtyP=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'target',
{
	get: function()  {return this.mTarget;},
	set: function(a) {this.mTarget=a; this.dirtyP=true;}
});

Object.defineProperty(Mecho.Viewpoint.prototype,'up',
{
	get: function()  {return this.mUp;},
	set: function(a) {this.mUp=a; this.dirtyP=true;}
});

Object.defineProperty(Mecho.prototype,'view',
{
	get: function()  {return [this.viewObject.distance, this.viewObject.alpha, this.viewObject.beta, this.viewObject.target];},
	set: function(a) {this.viewObject.distance=a[0]; this.viewObject.alpha=a[1]; this.viewObject.beta=a[2]; this.viewObject.target=a[3];}
});

Object.defineProperty(Mecho.prototype,'target',
{
	get: function()  {return this.viewObject.target;},
	set: function(a) {this.viewObject.target=a;}
});

//===================================================
//
// new Image(url)
//
//===================================================

Mecho.Image = function(url)
{
	this.ctx = Mecho.lastContext;
	this.url = url;
	this.texture = this.ctx.gl.createTexture();
	Mecho.loadImageForTexture(this.ctx.gl,this.url,this.texture);
}


Mecho.ongoingImageLoads = [];
Mecho.loadImageForTexture = function(gl,url,texture)
{
	var image = new Image();
	image.onload = function() {
		Mecho.ongoingImageLoads.splice(Mecho.ongoingImageLoads.indexOf(image),1);
		Mecho.textureFinishedLoading(gl,url,image,texture);
	}
	Mecho.ongoingImageLoads.push(image);
	image.src = Mecho.localImages ? (Mecho.localImages[url] || url) : url;
}


Mecho.textureFinishedLoading = function(gl,url,image,texture)
{
	gl.bindTexture(gl.TEXTURE_2D,texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
	gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
	gl.bindTexture(gl.TEXTURE_2D,null);
}


// Materials
Mecho.BLACK = {color:[0,0,0]};
Mecho.WHITE = {color:[1,1,1]};
Mecho.YELLOW = {color:[1,1,0]};
Mecho.BLUE = {color:[0,0.5,1]};
Mecho.RED = {color:[1,0.2,0.2]};
Mecho.GREEN = {color:[0.1,0.8,0.2]};
Mecho.TILE = {
	color:[0.9,0.95,1],
	reflection:0.2,
	shininess: 5.0,
	name:'tile.jpg',
	groundScale: 1,
	groundReflection:0.6 };
Mecho.WOOD = {
	reflection:0.3,
	shininess: 1.0,
	name:'wood.jpg',
	groundScale: 4,
	groundReflection:0.9 };
Mecho.WOOD_ROUND = {
	reflection:0.4,
	shininess: 2.0,
	name:'wood_round.jpg',
	tiles:[1,1],
	groundReflection:0.9 };
Mecho.DARK_WOOD = {
	color: [0.8,0.6,0.4],
	reflection:0.3,
	shininess: 1.0,
	name:'wood.jpg',
	groundScale: 4,
	groundReflection:0.9 };
Mecho.DARK_WOOD_ROUND = {
	color: [0.8,0.6,0.4],
	reflection:0.4,
	shininess: 2.0,
	name:'wood_round.jpg',
	tiles:[1,1],
	groundReflection:0.9 };
Mecho.GOLD = {
	color:[1.3,1.1,0.7],
	reflection:1.0,
	shininess: 5.0,
	name:'gold.jpg' };
Mecho.METAL = {
	reflection:0.7,
	shininess: 2.0,
	name:'metal.jpg' };
Mecho.METAL_ROUND = {
	reflection:0.7,
	shininess: 2.0,
	name:'metal_round.jpg',
	tiles:[1,1] };
Mecho.SCRATCH = {
	reflection:0.6,
	shininess: 7.0,
	name:'scratch.jpg' };
Mecho.CHECK = {
	reflection:0.5,
	shininess: 1.0,
	name:'check.jpg' };
Mecho.METRIC = {
	reflection:0.0,
	shininess: 1.0,
	name:'metric.jpg' };
Mecho.METRIC_ROUND = {
	reflection:0.0,
	shininess: 1.0,
	name:'metric_round.jpg',
	tiles:[1,1] };
Mecho.PAPER = {
	color:[1.2,1.2,1],
	reflection:0.0,
	shininess: 1.2,
	name:'paper.jpg',
	groundReflection:1 };
Mecho.ASPHALT = {
	reflection:0.9,
	shininess: 1.0,
	name:'asphalt.jpg',
	groundReflection:0.9,
	groundScale: 5};		
Mecho.MARBLE = {
	reflection:0.2,
	shininess: 5.0,
	name:'marble.jpg',
	groundScale: 20};
Mecho.WATER = {
	reflection:0.2,
	shininess: 5.0,
	name:'water.jpg',
	groundScale: 50	};
Mecho.ROCK = {
	reflection:0.2,
	shininess: 5.0,
	name:'rock.jpg',
	groundReflection:0.9,
	groundScale: 20	};
Mecho.ROCK2 = {
	reflection:0.2,
	shininess: 5.0,
	name:'rock2.jpg',
	groundReflection:0.9 };
Mecho.INDUSTRIAL = {
	reflection:0.5,
	shininess: 5.0,
	name:'industrial.jpg',
	groundReflection:0.8,
	groundScale: 4	};
Mecho.DEFAULT_MATERIAL = [Mecho.TILE];

Mecho.material = function(m)
{
	Mecho.DEFAULT_MATERIAL = m;
}

Mecho.custom = function(obj,properties)
{
	var newObj={};
	for(var n in obj) newObj[n]=obj[n];
	for(var n in properties) newObj[n]=properties[n];
	return newObj;
}

function onResize(event)
{
	var ctx = Mecho.lastContext;
	if (ctx)
	{
		ctx.gl.canvas.width = window.innerWidth;
		ctx.gl.canvas.height = window.innerHeight;
		ctx.gl.viewport(0,0,window.innerWidth,window.innerHeight);
		ctx.perspective(30,0.5,1000);
	}
}


//===================================================
//
// new Button(imageName,key,handler,states,initialState)
//
//===================================================
Mecho.KEYS = {
        CANCEL: 3,
        HELP: 6,
        BACK_SPACE: 8,
        TAB: 9,
        CLEAR: 12,
        RETURN: 13,
        ENTER: 14,
        SHIFT: 16,
        CONTROL: 17,
        ALT: 18,
        PAUSE: 19,
        CAPS_LOCK: 20,
        ESCAPE: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        PRINTSCREEN: 44,
        INSERT: 45,
        DELETE: 46,
        0: 48,
        1: 49,
        2: 50,
        3: 51,
        4: 52,
        5: 53,
        6: 54,
        7: 55,
        8: 56,
        9: 57,
        SEMICOLON: 59,
        EQUALS: 61,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        CONTEXT_MENU: 93,
        NUMPAD0: 96,
        NUMPAD1: 97,
        NUMPAD2: 98,
        NUMPAD3: 99,
        NUMPAD4: 100,
        NUMPAD5: 101,
        NUMPAD6: 102,
        NUMPAD7: 103,
        NUMPAD8: 104,
        NUMPAD9: 105,
        MULTIPLY: 106,
        ADD: 107,
        SEPARATOR: 108,
        SUBTRACT: 109,
        DECIMAL: 110,
        DIVIDE: 111,
        F1: 112,
        F2: 113,
        F3: 114,
        F4: 115,
        F5: 116,
        F6: 117,
        F7: 118,
        F8: 119,
        F9: 120,
        F10: 121,
        F11: 122,
        F12: 123,
        F13: 124,
        F14: 125,
        F15: 126,
        F16: 127,
        F17: 128,
        F18: 129,
        F19: 130,
        F20: 131,
        F21: 132,
        F22: 133,
        F23: 134,
        F24: 135,
        NUM_LOCK: 144,
        SCROLL_LOCK: 145,
        COMMA: 188,
        PERIOD: 190,
        SLASH: 191,
        BACK_QUOTE: 192,
        OPEN_BRACKET: 219,
        BACK_SLASH: 220,
        CLOSE_BRACKET: 221,
        QUOTE: 222,
        META: 224
};


function button(imageName,key,handler,states,initialState)
{
	return new Mecho.Button(imageName,key,handler,states,initialState);
}

Mecho.Button = function (imageName,key,handler,states,initialState)
{
	this.ctx = Mecho.lastContext;
	this.ctx.buttons++;
	this.ctx.panel.style.height = (5*this.ctx.buttons+0.4*(this.ctx.buttons-1))+'em';

	//http://stackoverflow.com/questions/1465374/javascript-event-keycode-constants
	var ch = key.toUpperCase();
	this.key = Mecho.KEYS[ch];
	this.handler = handler;
	
	var div = document.createElement('div');
	div.className = 'mechobutton';
	var that = this;
//			div.addEventListener('click',function(){that.nextState();});
//			div.addEventListener('click',handler);
	div.addEventListener('click',function(e){that.ctx.mouseClick(e,that);},false);
	
	var txt = document.createElement('div');
	txt.className = 'mechocaption';
	txt.innerHTML = key;
	div.appendChild(txt);
	
	var img = document.createElement('img');
	div.appendChild(img);
	img.src = 'images/buttons/'+imageName+'.png';

	this.states = states;
	this.state = initialState||0;
	if (this.states)
	{
		var statpan = document.createElement('div');
		statpan.className = 'mechostatpanel';
		div.appendChild(statpan);
		
		for (var i=0; i<this.states; i++)
		{
			var stat = document.createElement('div');
			stat.className = 'mechostat';
			stat.setAttribute('checked','false');
			stat.style.top = (4.1-i%5)+'em';
			stat.style.left = Math.floor(i/5)+'em';
			statpan.appendChild(stat);
		}
		statpan.children[this.state].setAttribute('checked','true');
	}
	this.statpan = statpan;
	this.ctx.panel.appendChild(div);
	this.ctx.buttonList.push(this);
	div.button = this;
	return this;
}

Mecho.Button.prototype.nextState = function()
{
	if (this.states)
	{
		this.statpan.children[this.state].setAttribute('checked','false');
		this.state = (this.state+1)%this.states;
		this.statpan.children[this.state].setAttribute('checked','true');
	}
}

Object.defineProperty(Array.prototype,'x',
{
	get: function()  {return this[0];},
	set: function(a) {this[0]=a;}
});

Object.defineProperty(Array.prototype,'y',
{
	get: function()  {return this[1];},
	set: function(a) {this[1]=a;}
});

Object.defineProperty(Array.prototype,'z',
{
	get: function()  {return this[2];},
	set: function(a) {this[2]=a;}
});


//=========

var random = Mecho.random;
var radians = Mecho.radians;
var unitVector = Mecho.unitVector;
var vectorProduct = Mecho.vectorProduct;
var scalarProduct = Mecho.scalarProduct;
var vectorPoints = Mecho.vectorPoints;
var sameAs = Mecho.sameAs;
var material = Mecho.material;
var custom = Mecho.custom;
var sin = Math.sin;
var cos = Math.cos;
var abs = Math.abs;
var min = Math.min;
var max = Math.max;
var sqrt = Math.sqrt;
var PI = Math.PI;
var pi = Math.PI;

window.addEventListener('resize',onResize,false);
mainAnimationLoop();

Mecho.version = '4.10 (150321)';
console.log('Mecho',Mecho.version);
﻿Mecho.localImages = {
	'images/materials/asphalt.jpg':			'data:image/jpeg;base64,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',
	'images/materials/check.jpg':			'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//wAALCAEAAgABAREA/8QAHAABAAIDAQEBAAAAAAAAAAAAAAYHAQQFAgMI/8QATBAAAQMCAgILDwEFBQkBAAAAAQACAwQFBhExVBIVFhchQWFxkaPRBxMiMkJRUlNVgZOhscHSFCNWYnKkJDNDwuE0NkVjc3SSsvDx/9oACAEBAAA/APqiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIirzby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulNvLpr03Sm3l016bpTby6a9N0pt5dNem6U28umvTdKbeXTXpulSDe0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te1xH6um+OFDyMjksIiIiIiIiIsgZnJTDe1xH6um+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te0xH6qm+OE3tMR+qpvjhN7TEfqqb44Te1xH6um+OFDyMjksIiIiIiIiIi/TqIiIiIiIiIsO8U8y/MrvGPOvKIiIiIiIiL03xhzr9NN8UcyyiIiIiIiIiw7xTzL8yu8Y868oiIiIiIiIi/TqIiIiIiIiIsO8U8y/MrvGPOvKIiIiIiIiL03xhzr9NN8UcyyiIiIiIiIiw7xTzL8yu8Y868oiIiIiIiIis6l7rJzyq7QNj54puHoIUgt/dHw7WENlmlpHninj4OkZhSmlq6ashE1JPFPEdD43hwPvC+yIiIiIi5N1xJZrRm2vuEMbx/hg7J//AIjhUWru6paoiW0VHU1JHG7KNp+p+S5D+6xVk+BaYAPM6Un7KuScySsIiIiIiIiIsg5EFWXTd1l4IFVaGlvnjn4eghd+390nD1WWtnknpHn10eY6W5qVUdbS18ImoqmKojPlRvDh8lsIiIiIiLmXTEFotAO2FfDC70C7N/8A4jhUVru6naISW0dLU1JHGQI2np4fkuNJ3WKpxPe7TC0fxTE/YKuScySsIiIiIiIiIi9ujew+G1zecZLwt22XWvtNSJ7dVSQScewPAecaD71amE+6JTXIso7xsKWrOQbKOCOQ/wCU/JTxERERaN1utFZ6J9XcJ2xRN8+lx8wHGVUuJu6Fcrq58Ftc+hozweCf2jxyu4uYdJUMc4kkkkk6SeNeV9WwTOGbYnkcjSvLo3sPhtc3nGS8IiIiIiIiIvq2CZ4zbE8jkaV5fG9njsc3nGS8Lbt9xrLbUCooKmSCUeUx2WfP5/erPwn3R4axzKO+7CCcnJtQOCN383onl0cysIEOGYOYKyiIiLUuNwpLXRvq6+dkMDNLnH5DznkVUYn7o1dcHPprOX0dLnl3zP8AavHP5Pu4eVQd73PeXPcXOccyScyV4X1bBM8ZtieRyNK8vjezx2ObzjJeEREREREREX1bBM8ZtieRyNKs57WvGT2hw8zhmuXWYft1UCe895efKi4PloUXuthqrdnIP20HrGjRzjiXIVl9zzGr2Sx2a7zbKN2Taad54WniYT5vMeLRzWkiIi598u9LZLXLX1jsmM4A0Hhe7iaOUqiMQX6txBcXVVa/gHBHED4MbfMO3jXNhhknlbFCxz3uOQa0ZkqT23CgyElxkOfqoz9T2KQU1vo6UZU9NEzl2OZ6StnMjjWHta8ZPaHDzOGa5dZh+3VQJ7z3l58qLg+WhRe62Gqt2cg/bQesaNHOOJchEREREXuON8sgZG0vc45BoGZKk1twoXASXCQt4+9M0+8qQUttoqQAQU0TSPKIzPSVtg5aCsOaHDJwDh5iM1zayw26rB2UAiefLi8E9ijF1w9U0AdLGe/wDS5o4W84XFVgdz7Gr6CaO03WUuo3nYwyuP8AcniBPo/TmVuoiItO6XGmtNumrq2TYQxDMnjJ4gOUqisT4krMRV5nqXFkDCRDAD4LB9z5yuNHG+WQMjaXuccg0DMlSa24ULgJLhIW8femafeVIKW20VIAIKaJpHlEZnpK2wctBWHNDhk4Bw8xGa5tZYbdVg7KARPPlxeCexRi64eqaAOljPf4Bpc0cLecLioiIiIi9xxvlkDI2l7nHINAzJUmtuFC4CS4SFvH3pmn3lSClttFSACCmiaR5RGZ6StsHLQURCAQQRmDwZFQ7EdiFLnWUbf2JPhsHkco5FHQcldnc7xKb3aDTVT9lW0gDXk6ZG8TufiP+qmCIsE5DM6FR2PcSuv14dHA/wDsNKS2EA8Dzxv9/FyKNU0ElTOyGFpdI85AKe2e0w2yDIAOmcPDk8/IORdFEREIBBBGYPBkVDsR2IUudZRt/Yk+GweRyjkUcREREX0iifNK2KJpc95yaBxlTuyWaK2RB7gH1Lh4b/NyBdVEREUTxJYmxtdW0TMmDhljHFyjkUXVydzPEpuluNsq37Kro2jYOJ4ZI9A940dCnKIipbuj4ldd7saCmeTRUbiBlokfoLvdoHv86h8UT5pWxRNLnvOTQOMqd2SzRWyIPcA+pcPDf5uQLqoiIiieJLE2Nrq2iZkwcMsY4uUcii6IiIi+kUT5pWxRNLnvOTQOMqd2SzRWyIPcA+pcPDf5uQLqoi+s5ttvp4Jbvcm0ZqATEzvTpC4Dj4NC+LLnhh72tZfy5zjkAKOTMnoWzXUpo6t9O54eW5cIGWkZ6FrPa17HMeA5rhkQeMKvLzQG3XGSAZ97PhRk8bSt7BV2NnxPSVBdlE93epf5HcB6OA+5X+iKL90O7G1YUqDE7YzVJEEZz4RnpPQCqKUywlbhDSmtkH7SXgZnxN/1UiWxOLdQUMFXdbj+lZUEiPKB8g4OIkaDyLU22wt+8P8ARydi2aumNLNsC4PY5oeyRuh7ToIRsdPFRS11wqm0lJEQ0yFhdm46AAOErW22wt+8P9HJ2Lbmhp/0dPWUdT+op6jPYOMZjJy48jxcq1nta9jmPAc1wyIPGFXl5oDbrjJAM+9nwoyeNpXPRERFLcI20NjdcJW+E7NsWfEOM/ZSdbEzbdQ0ENXdbj+lZO4tZlA6QZjiJGgrU22wt+8P9HJ2Laq6Y00obsxIxzQ+ORuh7ToIXmc22308Et3uTaM1AJiZ3p0hcBx8GhfFlzww97Wsv5c5xyAFHJmT0LZrqU0dW+nc8PLcuEDLSM9C1iAQQRmDxFQC/wBu2uuLmMH7GTw4+bze5Zw1dXWW/wBJXAkNjeBIPOw8Dh0L9DtcHNDmnMHhBHGsouDjW7Gz4Xq6mN2xmc3vUR/idwZ+4Zn3KgVLMI20NjdcJW+E7NsWfEOM/ZSdbE4t1BQwVd1uP6VlQSI8oHyDg4iRoPItTbbC37w/0cnYtmrpjSzbAuD2OaHskboe06CEbHTxUUtdcKptJSRENMhYXZuOgADhK1ttsLfvD/Rydi25oaf9HT1lHU/qKeoz2DjGYycuPI8XKtYgEEEZg8RUAv8Abtrri5jB+xk8OPm83uXLRERFLcI20NjdcJW+E7NsWfEOM/ZSdbEzbdQ0ENXdbj+lZO4tZlA6QZjiJGgrU22wt+8P9HJ2Laq6Y00obsxIxzQ+ORuh7ToIVd4nvL75e5qwgth8SBnoRjQPvzlSHANpbEH4hrYwY6d2wpGO8uXz8zfrzLvSPfLI6SRxc5xzJPGV5UdxlSh9FFVAeFE/Yk8h/wBR81Dgv0Vh2t2xw/QVhObpYGl382WR+YK6SKqe7DXbKvoKAHgjjdM4crjkP/U9Kr2mhM9THC3TI8NHvKs2KNsUTYoxk1gDQOQL0thkNPcqCaz1xygqeGN/qpPJcFV1yoai2V89FVs2E0Ly1w+45DpU9wRXm9WnaWVwNbR+FTFx8eInhb7tPNzLi49vDKmtjtNE/OjoCWlw0SS+U77D3rn4Sse3l12MxLKKnHfKqTRkzzc50dKn1bU/qZ82NDImNDIoxoYwaAtdR3GVKH0UVUB4UT9iTyH/AFHzUNRERe42mSRrG6XEAKzKWBtNTRQM8WNoavqtiOGnuVDPaK45QVPiP9VJ5LgquuVDUWyvmoqtmwmhcWuH3HIdKn2BrlT3W0G2XGYRyW4GVkjjpg8oe76KHYnvL75e5qzIth8SBnoRjQPv71IMA2lsQfiGtjBjp3bCkY7y5fPzN+vMu9I98sjpJHFznHMk8ZXlcLF1MJrWJwPCgeDnyHgP2UJX6BwZXbYYTt1QTm7vIjceVvgn6Ltoqz7sNdlFbre06S6Zw5vBH1cqxjaZJGsbpcQArMpYG01NFAzxY2hq+q2GQ09yoJrPXHKCp4Y3+qk8lwVXXKhqLZXz0VWzYTQvLXD7jkOlT3BFeb1adpZXA1tH4VMXHx4ieFvu083MuLj28Mqa2O00T86OgJaXDRJL5TvsPeufhKx7eXXYzEsoqcd8qpNGTPNznR0qfVtT+pnzY0MiY0MijGhjBoC11wsXUwmtYnA8KB4OfIeA/ZQhERF7jaZJGsbpcQArMpYG01NFAzxY2hq+q2I4ae5UM9orjlBU+I/1UnkuCq65UNRbK+aiq2bCaFxa4fcch0qeYKuUV2srrXWVDIprc0yRSv0d58oH+X6KFWC0zXu8QUEByMhze46GNGk+4Ky6t8LWxUdE3YUdKzvcLeTjceU6VrIubiJgksVUDxNDughV6rw7mUxkwVStcf7uSRgz/mJ+6lmyHpDpTZD0h0qj+6bL3zGtU3PMRsjYP/EH7rjYcZs77Sg8Ti7oBKsFEWpi21be2bbGBudwoGZTADhmi9Lnb9Pcq+o6uooaplTSSvhmZnsXtORGYyPyK8U8EtVURwQMdJLK4NY0aXE6ArUgoYrFaY7PAQ6XPvlZIPLk9HmC+SLm4iYJLFVA8TQ7oIVerIBOgFZ2J9E9CbE+iehYIy0rdsjBJeaRp0d9arGRFpYwtgvNl21iH9uoGhtR/wAyLidzj6Ku2SPYTsHObmC05HLMHSFv2C0zXy8QUEByMhze86GNGk+4Ky6t8LWxUdE3YUdKzvcLeTjceU6VrItK8sD7NWNPqnHo4fsq4Vz9yebZ4Sexx/uqp7R0NP3U12Q9IdKbIekOlUz3V5jJi1rM+COmY0e8k/dReyMEl5pGnR31qsZEWpi21be2bbGBudwoGZTADhmi9Lnb9Pcq+o6uooaplTSSvhmZnsXtORGYyPyK8U8EtVURwQMdJLK4NY0aXE6ArUgoYrFaY7PAQ6XPvlZIPLk9HmC+SLSvLA+zVjT6px6OH7KuFkAnQCs7E+iehNifRPQsEZaVu2RgkvNI06O+tVjIi0sYWwXmy7axD+3UDQ2o/wCZFxO5x9FXbJHsJ2Di3MEHI5Zg6Qti2V9Ra7hBXUjy2aFwc0+fzg8h0K0ZZKe4UcF2oBlT1XjM9VJ5TStdFzcRSCOxVRPlNDekhV6shxGglZ2R9I9KbI+kelYJzXSw68MvtIToLi3pBCsFEWxQTvp62KSM8OyAIOgg8BBVd4rpIKHE9wpqZgZDHMQxo0NGnJdvubRRivuFaWB09JTF0JcM9i4nLPnyUiJJcS45k8JJ41hFzcRSCOxVRPlNDekhV6rx7mcBiwVSue3+8fI8Z+bZEfZSvYj0R0JsR6I6FTXdYhMeK2SZeDLTMIPMSPsotZpBHeKRx0CVv1VjIsta57gxoJc45ADjK4+O7s2jpxh2kkzcCJK17T4zuJnMNJUIhgln2feY3v72wvfsRnsWjSTyL62yvqLXcIK6keWzQu2TT5/ODyHQrRlkp7hRwXagGVPVeMz1UnlNK10WleniOzVjj6ojp4FXCyCRoJWdkfSPSmyPpHpWCc9K3bNII7xSOOgSt+qsZEWxQTvp62KSM8OyAIOgg8BBVd4rpIKHE9wpqZgZDHMQxo0NGnJdvubRRivuFaWB09JTF0JcM9i4nLPnyUiJJcS45k8JJ41hFpXp4js1Y4+qI6eBVwrn7lEHe8Il5H97UvcOYAD7Ka7EeiOhNiPRHQqa7rEJjxWyTLwZaZhB5iR9lFrNII7xSOOgSt+qsZFlrXPcGNBLnHIAcZXHx3dm0dOMO0kmbgRJWvafGdxM5hpKg8MEs+z71G9/e2F79iM9i0aSeRdfFtj2jvDoYiXUkw77TPzz2TDxZ+caFv4HvkdBWvtte/K31pDXE/4T/Jf9j/opdVU8lLUvglGTmHLn5V8lG8ZVQZSw0rT4Ujtm4cg0fP6KHoiIvpBKYJ45W+MxwcPcVZsMrJ4WTRnNsjQ4cxXtF9Kf/aIv52/VQXHH++N0/wCufoF2O5vovX/aD/2XeRFG8ZVQZSw0rT4Ujtm4cg0fP6KIAEnIaV+jLDRbXWKhossjDA1rufLh+ea6CKte7DQ50tvuDR4j3QuPOMx9CquY4seHNORBzCsyjqG1VHFUM0SMDu1fZe6y4Mw9Zn3aQA1MmcdEwjPN3G/mCqyWR80r5ZXFz3uLnOOkk6SrOwnQRYds7JauBslXcmgzMcPEg4m850//AIoTi2ybR3h0UR2VJMO+0z/SYeLnGhb+B75HQVr7bXvyt9aQ1xP+E/yX/Y/6KXVVPJS1L4JRk5hy5+VfJcDF9UIrY2nB8Kd+jkHD9clCkREXpjix4c05EHMKzKOobVUcVQzRIwO7V9kX0p/9oi/nb9VBccf743T/AK5+gXY7m+i9f9oP/Zd5EXAxfVCK2NpwfCnfo5Bw/XJQsL9B4QodrsK26mIycIQ9w/id4R+ZXZRVr3YaHOlt9waPEe6Fx5xmPoVVzHFjw5pyIOYVmUdQ2qo4qhmiRgd2r7L3WXBmHrM+7SAGpkzjomEZ5u438wVWSyPmlfLK4ue9xc5x0knSVZuFaBuHLI2aogZJXXFuykjkHAyHiaefSf8ARbMhoa2ijpLvQNrIoXF0WchYWZ6RmOJa21OFv3e/rJO1bdZUtqDC2OLvUcMYjY0vLjkPOTwlaskjIo3SSODWMGbieIKurtXOuFwkqDmGngYPM0aFpIiIil+EbkHwmgld4bM3R58Y4x7lJUWWOLHtcNLSCF7rKXD1fVy1dbYu+VEztlI8VTxmeYL1TMtNvhqG2m1ClfUM73I8zvkzbnnoK+KLzJIyKN0kjg1jBm4niCrq7VzrhcJKg5hp4GDzNGhdXAtodd8UUsRbnDC7v0p4ti055e85D3q+0RcTGFpN6w1V0bBnNsdnF/O3hA9+j3r8/uBaSCCCOIqUYQuQGyt8pyzOyiz+Y+6lS+9aLRc2wG62r9TJBGI2OFQ9gAH8I4Frx23DEUjZGYfGyYQ5uyqpCMxyHSvtVVElVUvnlObnnPm5FmQ0NbRR0l3oG1kULi6HOQsLM9IzHEtbanC37vf1knatusqW1BhbHF3qOGMRsaXlxyHnJ4StZzg1pc4gNaMyTxBV7e7htjcXyjPvTfBjHIOP3rnIiIilWELkBsrfKcszsos/mPupUiyxxY9rhpaQQvdZS4er6uWrrbF3yomdspHiqeMzzBeqZlpt8NQ202oUr6hne5Hmd8mbc89BXxRYc4NaXOIDWjMk8QVe3u4bY3F8oz703wYxyDj962MKWl16xDSUQbnGX7OU+Zg4T2e9foMDIZAcCyi4mMLSb1hqro2DObY7OL+dvCB79HvX5/cC0kEEEcRUowhcgNlb5TlmdlFn8x91Kl960Wi5tgN1tX6mSCMRscKh7AAP4RwLXjtuGIpGyMw+NkwhzdlVSEZjkOlfaqqJKqofPMc3POfNyL5IsPc1jHPe4Na0Zkk5AKF4ivn64mmpSRTtPhO9YexcBERERfSGWSCVssTi17Dm1w4ip3ZL1Fc4gx5DKlo8JnpcoXVRERYe5rGOe9wa1ozJJyAULxFfP1xNNSkinafCd6w9i4TWl7g1oJJOQA0lXjgHDe0Fn2dQzKuqsnzfwDiZ7uPlKlSIipzul4ZdbLkbpSMP6Srdm8AcEch0+46elQiN7o3tewlrmnMEaQVOLFfI7hGIZnBlUBwjifyjsXZRERYJDQS4gAcJJ4lEMRX4VIdR0Tv2PlvHl8g5Pqo2iIiIvcb3Rva9hLXNOYI0gqcWK+R3CMQzODKoDhHE/lHYuyiIiwSGglxAA4STxKIYivwqQ6jonfsfLePL5ByfVRxXT3OcMmy2s1tWzKtqwCQdMbNIbz8Z93mUzREVOd0vDLrZcjdKRh/SVbs3gDgjkOn3HT0qERvdG9r2Etc05gjSCpxYr5HcIxDM4MqgOEcT+Udi7KIvlLUwQtJlniYB6TwFy6zE1vpwRC41D/MzgHSVF7peau5HYyODIeKNmj3+dcxEREREXtj3RvD43FrmnMEHIhSO24rkjAjuEZlA/wARnA73jjUgprxbqoDvdXGCfJedifmtxr2O4WvaRyHNeJamCFpMs8TAPSeAuXWYmt9OCIXGof5mcA6SovdLzV3I7GRwZDxRs0e/zrmgZq0u57gl8D47zeIi2QeFTwOHC3+Nw8/mHFpVlIiIta4UVPcaKairIxJBM3Yvaf8A7SqMxbharw5WkPDpaOQ/sZwOA8h8zlwGuLXBzSQQcwRxKQ23FU8IEdcwzMHljgcO1SGlvVuqgO91TGuPkyeCfmt5r2OGbXtcOQgrzJPBEM5Zo2D+J4C5dZiS3UwIZIZ3+aMcHSoxdL7V3HNjj3qH1bOPnPGuUiIiIiL01xa4OaSCDmCOJSG24qnhAjrmGZg8scDh2qQ0t6t1UB3uqY1x8mTwT81vNexwza9rhyEFeZJ4IhnLNGwfxPAXLrMSW6mBDJDO/wA0Y4OlRi6X2ruObHHvUPq2cfOeNcpWV3PsEPfLFeLxDsY25Op4HjhceJzh5vMOP62miIi1rhRU9xopqKsjEkEzdi9p/wDtKozFuFqvDlaQ8Olo5D+xnA4DyHzOXAa4tcHNJBBzBHEpDbcVTwgR1zDMweWOBw7VIaW9W6qA73VMa4+TJ4J+a3mvY4Zte1w5CCqtRERERERERFnNYRdSz2G6XubvdupHyjPhflkxvO48CtfCeAaKyFlXXFtXXDhBI8CM/wAIOk8p+SmSIiIi+FZSU9bTPp6uFk0Mgycx4zBVXYn7mlRTudU2EmeHSadx8NvMfKHz51X88E1NK6GoifFI3gcx7SCPcV8lnNFhERERERERFnNFhdG1WW43ifvNupJJncbgPBbzu0BWlhPue0lqLKu67CrrBwtZlnHGf8x5T0KdIiIiL4VlJT1tM+nq4WTQyDJzHjMFVdifuaVFO51TYSZ4dJp3Hw28x8ofPnVfzwTU0roaiJ8UjeBzHtII9xXyWc1hEREREREREWQMyArXpu5RQgg1N0qJBxiONrPrmpBb8CYcoCHNoGzvHlVDjJ8jwfJSKKNkUbWRMaxjRkGtGQHuXtERERERadfarfc49hX0cFQ3i74wEjmOkKMV/c0w/VEmAVFI4+qkzHQ7NceXuSxZkxXl4HmdTg/5lVxGRIWEREREREREWQMyArVpu5PRgg1N1nkHGI4gz6kqQW/AGHKEh36H9Q8eVUPL/lo+SkcMMVPGIoI2Rxt0NY0AD3BfRERERERadfarfc49hX0cFQ3i74wEjmOkKMV/c0w/VEmAVFI4+qkzHQ7NceTuSxE/sry8DzOpwf8AMqtRERERERERF6b4w51+mm+KOZZRERERERERYd4p5l+ZXeMedeUREREREREXpvjDnX6ab4o5llEREREREREX5iRERERERERF6b4w51+mm+KOZZRERERERERYd4p5l+ZXeMedeUREREREREXpvjDnX6ab4o5llEREREREREX5iRERERERERFkcCk2+Bikf8T6iP8AFZ3wcU+0+oj/ABTfBxT7T6iP8U3wcU+0+oj/ABTfBxT7T6iP8U3wcU+0+oj/ABTfBxT7T6iP8U3wcU+0+oj/ABTfBxT7T6iP8U3wcU+0+oj/ABTfBxT7T6iP8U3wcU+0+oj/ABTfBxT7T6iP8U3wcU+0+oj/ABTfBxT7T6iP8VjfAxT7T6iP8VGTwrCIiIiIiIiLI4FJt8DFI/4n1Ef4rO+Din2n1Ef4pvg4p9p9RH+Kb4OKfafUR/im+Din2n1Ef4pvg4p9p9RH+Kb4OKfafUR/im+Din2n1Ef4pvg4p9p9RH+Kb4OKfafUR/im+Din2n1Ef4pvg4p9p9RH+Kb4OKfafUR/im+Din2n1Ef4pvg4p9p9RH+Kb4OKfafUR/iubucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qbnLtqnWN7U3OXbVOsb2pucu2qdY3tTc5dtU6xvam5y7ap1je1Nzl21TrG9qnyIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiL//Z',
	'images/materials/gold.jpg':			'data:image/jpeg;base64,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',
	'images/materials/industrial.jpg':		'data:image/jpeg;base64,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',
	'images/materials/marble.jpg':			'data:image/jpeg;base64,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',
	'images/materials/metal.jpg':			'data:image/jpeg;base64,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',
	'images/materials/metal_round.jpg':		'data:image/jpeg;base64,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',
	'images/materials/metal_subgear.jpg':	'data:image/jpeg;base64,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',
	'images/materials/metric-r.jpg':		'data:image/jpeg;base64,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',
	'images/materials/metric.jpg':			'data:image/jpeg;base64,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',
	'images/materials/metric_round.jpg':	'data:image/jpeg;base64,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',
	'images/materials/paper.jpg':			'data:image/jpeg;base64,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',
	'images/materials/rock.jpg':			'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAZABkAAD/7AARRHVja3kAAQAEAAAAPAAA//4AJVJlc2l6ZWQgb24gaHR0cHM6Ly9lemdpZi5jb20vcmVzaXpl/9sAQwAEAwMEAwMEBAQEBQUEBQcLBwcGBgcOCgoICxAOEREQDhAPEhQaFhITGBMPEBYfFxgbGx0dHREWICIfHCIaHB0c/9sAQwEFBQUHBgcNBwcNHBIQEhwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc/8AAEQgBAAEAAwERAAIRAQMRAf/EABsAAAMBAQEBAQAAAAAAAAAAAAMEBQYCAQAH/8QAOxAAAgEDAwMDAgQEBQUAAgMAAQIDBBEhABIxBRNBIlFhFHEjMoGRBkKhsRVSwdHhJDNi8PEWQ2Nygv/EABkBAAMBAQEAAAAAAAAAAAAAAAECAwAEBv/EAC0RAAIDAAICAgICAQMFAQEAAAABAhEhEjEDQSJRMmETcYFCkfAEUqGx4RTx/9oADAMBAAIRAxEAPwD155njR+y+5UIVpAFIBNgLDm+ec++vN8adHpVLLPOn09Q15ovxZlOwh3AVgScL7ck/PzrSSb42aLcY8g4aSR9wiiEaP22sGw17MAAcE3tc+PA50svFSAvIujyHphpapZ5eoPDGzuTYmwGbG/gXvzcnSuXxqhoxp3YWg6wlbQVMVHEz2n2GnnJRk3cEWFgvBH66m4OOy/5/9Hc1LV0MIhoVftwBatj2vxAdtgbFRb1Gx+M3+50uy7BaXRTNYekQxyVdQskOd8npEiqf/E5IufBvjRhBSWAlKUf6E+q9diWo7cc0aFLxlGhe0nIBDD7Wtf551owb9Bckv+MhJ1Cqqo98vajDEMijhiLG5uceRttjOnUF6ApOt6InVawsO4CzQRkepjdnOMD4GTnm3nXT4k1hKe7ZY6dC1RGYzSo4jBt3Pe/+YfOl8kuPvR4xUtrA/T+jGCekM0pWa7O7IuLAXt+ozzpZea016FXjr+yj0+tUVgmhqfwgrLttukcXIPxxi/JzbUulhRK+zidoY3i7bnbGAgiguQbD8pUG1gLWJ8DB1k7RumFbp+3fLJKYVRt8iRp6ybHk38C5HGtGVIxC6zQNLV/4tJHNE62iRWuRIQLeBknN/v76tCaS49iSTfyKFbRfUUYnaDu0qBdtkOyE3wOMAX9s3+NLGlLvTNuS05glArXikqGKxyouULBW5AHtYHn7fbWSaV0C02aKspzTyLUgDuX3sv5iD5Y2PObakk3ZTDHdZ6vBVntx0rmeBu5LuTAxaw425IP6nVVCtTE7tUN9OqO9HTQVkjkqdsZDBGIFiUItkg5uc2PHnS8qeDcW1RpKaeGk7kctrTECMgZB9iOLX8fPNtB22ZJexWuiglqkRtsVcXVWCgswOSFsLjIxjgE61Ur9GUlJ0ZV6uo6fQLaWSObvSGSQxglQCcW8DH3IONWhFTZOTcUX6GWvmglnZIaftENvkG7alwTtHG4A5tf50PI4rDQTaF+pdVSAGji3tSyhpGKsUBYeCSLknGALX40FB0bkuyt1OpEsccpVpTsUSgLsULgBh7kY4t5vpOO0Ui3VsCsVLII3jKCOLcwMakAN8j/24++tFU+wtclglJJK1OopZVLbi++RdqoALHJJt4It/TnVFfbWC/qxCjp2q5RUJOriJE3SfzrbAtfk8WsOPvqj8lKqJqFu2LpVRRU1WCIDKTkSX7rPyBfOfjg6Lm31/wAQIwwMImqqWKqZY4ZYJFkkaKbcS1sgA8XJAtke2g2lg6Tq/oqMxqY2qVkC0o9hgW59N7n73H21CU3eIpGKrvBmKgDGOnhZHVHW0u6wYnNx/lNl99TUmnoziqdDU9lo5Znupc3a8d1dAc5HBOf34078rsSPjVUZzq3UKhy1JBL3F9REMQ3BEt6skgAjFuTc6t40mraJTtYNdGWuqKCnE92jj/JGkYDpYWANrXtfkm19T8kIqY0ZScC3VEQxzGaLuSg7CJnJFxnHvzyPtqMn/wBrKwSv5EaWs66lfC81DRvOqkmodGsUIve1jxa/NudUhGHFuxJybeo6rJEpKhHc06Szqdu1CFuec+AAbj350i6pDru2Z2USdS3RRyRyQEg/j+kkHx6f6/1510QSiuRN23xRVo+kwUiRul1VW7ke0FIgoHFjcED3HnSvyWGMKQSknchopKdjTzG/qJ5uf6W0JJdx7Gg30yqI+/RuvqliDbhGtiGJHBBzwD+uoxtMdvMOqYUz00tLElP3FkbaiADYoG61xe4tc34B861NSs1rjQKrio+ndMaugeNEhQSBpja4OAQPnx+mn2UlETEmJ9G6zUtViGolRI1lV1Ha2nt29KX5N7g6efhSVoWM7uzcUa0dUZZWji2bCHtZg9+bEi/OfbSrrTOxaoWmlMcNPSBgfTJb07x7AnPnwdJxRrfs4fodBUxSyGm2OqLGfUz8chd+AL63BpWmZTZIrKpOlOtNURrCE2qsjhjDjgGwNseWsCdPFN6gPCbT1XTlp5HoYnmmqxmQOu8gEgkqpIxzjkaaVvGCLrUZ6l6DX9V6pVytKizPtkeSws4F8Z82B45BsfgSkkh0r7G+pdQm6K6xyqHjgj/LEN7XHJNyCFFxcE/rowXJCydMs04j/iAPK0dqaefel9yMzW9RYtnPgeAfOl1OjZVmqqqdE7cMJjhEl3kCgAM2LEeLYFvF9Brf0ZPP2TpYPqZo519EQa6xSOQQAeL8G9vbF7ablFLAU2Z+roh1WmDJGI6lSxMsgZGbJwfgg+Ln7aeU+HZowvo6qOoR9HhpxIXmR3CCOUWUNYlrn+36e+opc26KJqIOOq3wsJpSJJmLbE9JAtYAXxcA/fVUmlSQrd7ZWpKBAQWEiCVrxRkG/GASeRe1/wC2s/I+NIVQV3QCuWno6iFQz5urYCmNv/I+f0vqfKUt+iiSRmj02XqHUqeMyF6bewjd1HqkvkkD+X7+NdHgmq3sn5E+10XeodJmMm0SCRYCrOgXag2C4sR4vn9ANTc0pUOo2uikRH1iEU0E9lgO52jW6EhTfI9xnOAffUopxdszlywJKPp6dUpYJY4yFLi2/uIP5RbjIyNZunbMtVIjVVK8sdZTo47kr7ytO52Qi4AsDggi/jm+itqw9JntD/Dk0xkatd0pYmJjhV1aXGFvYe7E7RzjVX5VH8dJ8G/yL1PPR08UdMjrJtayg4Vvt7EYOf31Byc3yHUeKpEmXqscFb6KuRES7IIIw8m4GzYudoW5sMX8/LeONa0LN3h1T9XmqenSjf3qWRl7sao8aldwF7g+k2Bv4/pouCTNeYDnoIS70apAKdF7pk3MJUcWta5x48Zv8aVKvl7/APAy+v8A+nNOkKQvVxqLTMzFGFttmseRyT+mdZ3VP0Mn7RSinFSzrFAXMT3SFRdgL8u3GD4/11PjToa70X6hNTsAYy0cjMVsgOVsb3++OfHJ1WCaJNsXipYlo5JakJdLmRCL3Xwtxgn7YN9M4/TNGTvUddIjelVZ4YAsjRNGVWwQKRbdnzY2PjQ5JBabwi9fr55po6NO1HIFI33ZsG3qBIsVtnI8ap4o3chZ/R10n+H4YLVMkf1CFLKv8tvkEm5Nr3P7aM/N6NDxrsq0v8QtUyGlpIwLqfTcKFtgW9x8Y0OCXyYeTliGYOpypA0le0dwReNcki17mxsv9cjSNbUTf6fkWun1UVRO0yvIZQQ8b7QN1/G48C3sfvpHofihasp/oqh2qWpmLSAO88oRgWU7RYZN7C5P+2t4tQvkpMxlb0Ojr5VqIJvpJ1iJZqZNrSZP5hfNh8fGunk4rVZFRtnPRqqsgrIoZUptixtMksAPIwbAfzm4Pta+LjU5Ri9RWLlXFjdNTxT1waNQ/bQo7s/pZiR6Ap/PYYPvf9dBcq4mzWPdEAhnrYl3NLRkxSyFma6KTtO32Ce3+X9xbi79GxqkWuoS1jwFaaR0FwwdyG2Ec/FvAt++ipaZRpMSpJo4Y6d5jGvdW6Mrhg1+TYXxc+2goU87DztaJVNZUUKncYnbuKqWCg+om5znFr3+3g6aME7dGt9ETrcYlhrEg7s0kcq2Yix/lIIv7C2fY6VNpoekB6P02elkFRUpKoXcqBkwqnwpBNyQebe2qPyxca9k142vkbSnEb/UVMkwLqgjCTvlSc/ygc2P+t9TvKGS3SL1WN6aonO3CLujQADtqfHnJva9/fQi0sC1enXRaZP8Ro6dZoVVFJ2EjcpIPBa1re+mkvjyiBP0C6l/ESdNrmoY2KMsqo0kkgK7ibX2jn34HP66aMHOLkwSlx+KHamtpqaMpB3AtQ6mQouwuSLKLcEm1782trn+TwdRQbqHUXrhIkTSxxrubvx7Wz/KPYBcE24xk50YdW0FpJ0hbozxxxSkd406yDFT+beMc248gcW083gIxNBMjLaalXcRmaRhtUj4xcn54GpLbsb+jNGGnr+sVFOl2C/hvMsu5iC1wuFsAT7W4vq0MjpGevB+LpEcU0DxI/01PtMcZAy1yBcjLC5J5tf5zpbbVoyzGUIulpJ00xxN+CGd9g3Judsbb3JsB7+2hKbXY6inqM9UrJQU88VW1PLTT+rfYhSwwAb23Ztz7aNuVOPo3V2fTmGijnd42+qaO5aQ+lCPH64t5FvnWhc3+gyqKw46L1ipng39xqcyI6CaRSFjU4HAuTn7aby+NRYvjm5LSrRVklbS0SK28Rt2wQvpIAG5R7G/v5vocaNd9CclBUJU3MJWnP5HB4JObi17ebji+tb44wqm9KD1MiSyRLDB6Td+3JsY8+pMbTa3DfvnUkl2O5OqIdbRvQ9Tp455e4jBNtyWYAm/AyAb3A83FtdHj+UcJSdO2aY9PRonJUo06gLe1gR4xyfNs/01P2OmK03TBRN24og9RIp3MEBIN7brjH7Y1nJvfRkkjp4O5E6uSsJN3YgEsfJxzn3voJtgo4mr46GFYEqKgJIVZW3BSRe5IPAJyPtrKP0bl9kuaRpnEvT7SFN8aSTMWYt73xcm2Laoqj2K9/EnQVVZ1SeOIypE1O7KbrdgWW9gSRe55PxxfVM42T1ujYP0ZKyhhWoqJmljRGj7JKMh22AHnkm/PnUeXspx9MiwdPTogkZYy0NCQBJIRxY72A5ubg/GRrObujcVVopMjzAVSCGBK5AZY1uzNtG2628AAZ850km1g0FZ1O1MZE6WgapRFUb1b0qLW2m9vUBz4/rqvi60SfZ71FWiiiCt24ocFSLKbH0gi98nIA5Om90BdYZR5JqmZUeFHiaRnYGEhWCiwtfnH341RJRQquToN0wfXzIhWN0CtY7yxzyGHnNs/Ns6jODiv2WjJMqNaophHvjjUsExZhuJttA+440nFoPJNdlSup6nptPKIo5ZJl/7bEXJK2wp8HzY6SLoNWiALVVVFJIyFN++YOhtYCyjm5IJv5FzxqsJQWIVqQnXUFQUWo6esKTBzu3KTknIIOL2I9vOnTXUugfv2c9Lo6IVlVUPL/1kV+4/bIHvlSMmxtYGwHGklOUVx9MKipNyfaGFZeoFY0pzG8LF2JN1XPN/+dJXFXYVK8odqVekoZhDHvSFTchgA49wPHkcnnWg03XQXmifRqiWGijnTBkG8RsbO7kcDwBtPn21TyJcqFg3xLtTU1NTHAizSpKwCGDZvVCDkDN/YXFh+uo1VoaMr7EenKelwvWVpiip94UsuA5JHkA+cD3vrN8sS0GLWUKWvIjmWYhUYkBEN2Q3/LtBvYe2gtSSYyq26Av1GnqHMFIzNKshMscgMdiMri2ePgW5zp+Ev9SwHJemCqIX6hSMGp3+oiUeqBgd3ve5vY/pYe+spU7sFWqoWng7m76hn7q22KUBCek85zni2jGVfiM032M09HDGlKGibuKmwNu3K2P5c4ybXNrW1ud2kLwSqxSWaCjgkmSSMRuwXdtuyt72Fhnggjxe+me4KlXsdlasrkeek7yhQFZIS1rlgL+Rm2QuMDWbjdIyTS7JX/5JT9Fr6eFtkM0A2rMijazMLlHZuSb4ObgnjT/xvyRuIrkoy0eqaFBVR9QrpCsUL3sos0huCEPvYj340kZOKcV7M1Fu36H6bqUdbSuYXKSsCd5uVvexWwuLj2B586Djx7DyvoFDU7umuGnYvG25WvvRhbN7+R7gXHGhxt2hk80SreqTilaMzekBYw1hu3HggXvY+2nUPkI52hCaOWn6aHMyDu7lkack9sFTn3vc4N/vp2/lXpASpDEDyx0cclJAlPEQq7IVaR2e3gkbRa3g4Ot8ZOjJtIjzzN1PrcMs8iRKsTTTlF2biQAL/GST73xozqMKRofKVs01PXVtLFD9SfqKNnCxz7tpC2sCwCi4v/MPHjBOoeyvrTyqqIKXqD9MdVX6tlVWAHcWxGCDgNkfFieb30zjyTaJppdh5XqPopRKoLRsVuUAYJcjcSp4Fuc3vzpYU0M7TJ/ReoI0dZJWbbQAMkbYtnNreL2tqrjVNASbsswdRp616ruOsMMPrXdhXAOPU2Ra5PvfOlkmtDH6IlRWp1JIihVKZnu0UdtxB5IP3HjJ1Xi4x+QLt/E+6N0yhhqqllkVIgNzKBYLbN84yeAPOlc3JUwqHHUUw9HHO7U9GqqzDuuzXYEcGw/MeTfU9z6AlgzJPFNIrTwym5vcqTbN7A8A/Hj9dI0/seIgIy/VXSHeRMiltq2K2HPscXAF+bHSJfYZOglV0uKQyIXQOp2yl2uGYgXYAYAP9r63OSX6Ckn2IxRiP6imQ7s/mXmQgY5+eDppNypoVVHAgijBBkgjVEa7GOIkGwwtr4b9/voq7oGDzyI9G5SQyFrXsAQTwBttn7W0Jdh6QaKKloEEcdkmkXtu+zG3znH6jSPk27KKqw6+rjlgKo0pSKXubo4xvIB4N/Hu3nxrLM6YlXbsxH8R18tZAkc3amjWpDFViAF2FgdvGLmxN8i/nXT4YrlZPyfiGpZaivgmUqIh6md9o3uL2FvbgZ+PvrTiotUbx/KLQ1FRzu4mm32A3MWF9xBwTwBxb2005VddmjHbZSpephZTLVgw7zlVj2jffNgL/t+uovxuh+W6NuEkUyEB4QSW9Nm/a/IGRjU1a6HfQQyU7OkkMpE4BKFSNrW/lIt+1/fTRjgG12MqIOqxKj06QyqELBgVYW/mDnJvYA30LlFuwVfQl1usEvR5IKeIRVhQqfxCVAPgAAHcwA4OtHJW3hndOjCVlHNMlREkIjapjG9929QVNzZiTwtwf+NdUJJeyUldlzpG2Lprgg7I3O0peR0jsCA4v6ski1sG3OjKm87Jq0PdMq5ZFjjlsEuRGiDKgHksMk2H6W+dR8yTZbxX0cQzlKphErqi7hutYFif9SfnOm4fEHLSNHBItUkk7IZDJeQKDhbY/uP11V4hEvkaCFKBwsTUy1kSWKGRNyqASW/MccXuOdQ1jviUulVsdbDNA0Sw0K2PZ3mVrN4JPB5NsYt76VrjoVqpIidaoqPp0lK9DMqwySFJAn5lHA59if66pbd3oUqNFugrqQpIzJVdzZsEYbKixHNgSD4FtTjfbGdLDGdcppYzFXTOsZUJH3LAS07g2Ukef5R9jY6eD2kK0UP4f/jGRfrFr13TwDty06ABrWPHupvcH9uNF+Gna6FU7VPsjfxBGlbGki/nLC0TEqU+STn/AEtnVvDFxxieWdrOz6kpHqqUxSK9PCYzeWc2iNrbbNk33f00Zy4vGTTtPAsgakUyBwabDMDe4NgBa2fv5Ol58vRSKr2WOjSVEkjtOQaGdiTI8YQqb+naDyQTn/U6jOk6RWN1fo0VNTLIWuFkjQBJCrWLjdhlU5J+fnQbbTSFz2KTBPqfp55bwAnb6iCx8Li36+TpVJqNMfim7R6YxT09OqQxxF3YIGbaSbiwsM3uvA/zDScb03LWUZayQ0wYyxwSzyBXjWAPKCT6ha2QtiM55tpqT66E/bJ/WKUiGFzCkJllLSgE+lhgE+bG35SfI1qV4xk7WitZFVqBaJXY7du1rrYnGR8+/P20FJPWbi1hZ6ZTiioArbixQb2ewII5z8+Pi2lcuXQ6jSpkrrEUlLFUzqZjS1EfbZjbaG9j5W+Lg4xnxrRb5cQNLjyItD/0O49OkkkmqOVC+pR5Zj54tf2085OWSBGkriIr02nrGiiIJEz9yXauTj3tkXt+nGqeNtd+hJ16Nv0HpcUtaiOe8wcSEA7miI4JUG5xe9j5vqzkpEEnFHNd2qBZSlXEhNlbldgNxYk8CxtrnVtnSmkjMTQUc7zT/UrJNGSQ8jbnZh8e36carbWNCJJuwtFJUT0aQwCOOMkHe0Y3nNiLeL49/HzqbjFStlE21g5HVQU9IaeSpbex2vAUaTfYgi5sQRY++g77SMqeNn0nVoaahkYNIWclWiQEHGN2cc+PYc5tpeFvBk6INPS/43GGAKneVZ+5ZQSb3zkEfI86rXAlfIcMNP09YYifqCjhkZsknzYWsUJ8D251tlqQKpaymtdTUcc3beFSwAUSLuDGzWJF91i172vYgeNLFuX5+jNKLwCKGShhSqlmVQwHdcRF1BJ8bc2+baeS5dGjJpDdUtLUUm+JAYQwdXDencOLA2Nx9s/Ok5S6HSXYv07psc8xl+milCS/iElSwFiQbXuFHsOR7ae+rFSx0igtooNglVoEHpAJQg83UeBi/tgaWdGin0ILUOs5dJS0TXU3Lb1xx/8A1v4Pv41ODtUyrX0JVlMn+HSyAIZArIdlstwci1xa5P8AXVINKVCtWnQlBUVKxuJYo0MqKTMJHDW83twuNM4K8YE2lqFevdUaWmabsPLEn/cjU70kvbBbm2Lfrox8TvAOaoR6eyzNCZozHLTLteJnKvJYnJI4x/XT3KqTF4potJNS0/bqjVzvBCiySxOyAsTi/kXPwPvpVz6JtR7D0c0nVa6oeGnE6yEqkXe9OOWW/CjGCORa50vk5NUsD41BbZ9L1BqDqElL1COnnlqG3h4XupFyLDAsQLnkixx5GmUJcexlJX12W4Oi9JWCBI6iV0cntR7zggG4H25F/b41G5vSuLAdbJF09aSngkXu77q0jG7i1znAIAGce2tB3KwOOFWKq78iFnikenBkZljtYHBAPIOfHte+hKNKzR+gHUGjSup6RKTvzSsW3bmBjFvzAkbb2sQPbknQSd9hdNB1rWpI3Rnp9kwyhQKb3OQcWNxz7ffWkkugQuXYjLR1CxiZJRG6FWtLLcsl8jN92P8AQ6C/YW/oU6T/ABjTQQSdP6xTzUsgAYBNpWawLZbzx+ureTwVq0SPktaUeu/xVTz04FHWQJU3VmHZ3IdwuADcgg4uLg6lCDTtoZ1XYhXStWQzUN2gmlhAEksl+6MAj/xzwM6Nv8jRqqIs0MirLeaKOJlLyIv5/F/UOPIt9s61tvEZRS9mk6H06OgiRUk7kdYAFYj1t5Av5FuTbSynJumMoxSssdNd50qYqhnKRXRYaZcHAKhr8c2ORc6t46atkfJd4Rf4kcpG4kiggh3FCFjIdz/MSCb7vFsDGni1KVoCXGL0xknWZVl2Rxtuj9Gwja98hb2sATf9Ob6d0lvs0bf+DSdJq6jqXT5KOrpmkXaQirEu6xBvbi59r86EoKMk0b+TNGZRBXU8Uz1TSxgXX8wsAAoIDC4xYWIuPGubYyaKrVaJB6BTLIlK1RLT1C+mWN2ZWjv44sfH2+ddC5Em0+h0dPo6Kmkhnqe33AwIiPqYm/IBzYng8Dm+pXJux7SVIA8LVFJ3aeFoTBGFG1bBrG1rEft/rpmxawF0SjMISRp37+wmR2Nyc2vc8m3ONGcknVGhFtXZfjj7m2DsjtpGGN5LG+Rb+5586n+x6diXVTK8CyFQha3bW4ILe1/PHvpU02N0gMvVWOwwiOFHQl5pkIDC/wDKwxa/24zoVxW9hTvroly16zK9PG7RO42q0w3kgnLFhew9rDHnTKOWzNvpFioraWKn/Bh/ChSzMGu8jNyy7vPj+mgk30bko9k+WjDUUMM8c3dQqRBGwIIwWAxe4suT7HTwtsV6gVMfr5LCOMzReE/KmQLWJ/lFzc++BqklxEg7D0kUhE3aMzK/o7ipZDzfdYZH7aDnljRiS+pdMakngSljRmcbu2R6QtrMSLXF8fYj41ovknZnFx6IadLWoWogaQRVLqFjPd2KjA3tITnP7G3jV/5EvWEX4r96aX+EOjP0vvSVdRvrawBt4UiN7AhVXNwCST45udRn5nJ0lVFIeFJW3ZXP8O/XzRVSRyxCFystIzghgQdpDHDW5/3PKubcWkOoRT6LkklMtAqx7kqXGzYpSNXccE4ve2T821G8CoO2mY/rNXTV/UGf603hivuyTuuQxubW8Ytf99W8draxiSpqr6OqesqYI4ZEqahIJCLM8OzuH2BPjHB99PV2jRfv0NzfxFMrJCIzJPdWQthjkAj2sfnUl4b0dySVFaTqyfTzblhR4rgqVtckG+Bg5A0jhK9MuLToy1V1nqSbaqIuZ4fRtFhHb2B45a4IxceddcfHBqmS5y7QtWwQVoWNqWYQd1AylLj5tf2NuMaesEdDVG03UJ4aCs3LPBGEsguthi5YW8cDi51HyUk5IpC/xZzSS9nqVRSzbjSTv6ljbFwPnm4tf+2pv5KxmqdGwpKenqIHqGCiJFCbNhAHBtgc4sBbz+uppJhdpUepIkgMzNF2pJCmwLZlXkXHK+qxxYaR9GTfTLMCwUkbSvcRObyG20Ac5xcnI/fVoy+NCOFsxvWuo0tVO1Kib0BLgHOL4t8/Y28aPjUu2xpOKwlSdKep7feNgp3CJAdwt4JH6ffVnKNJvsRRk3XoY7tD0RoamsrA9ScNA54ucizDNrn7aRqXkxIZcYK2x2euPWXkFLOizSWcpI1iV4Nhe+7jH20qjw2SDyUumfQ1yVMas0xabeDdo97uw8KDyBk2PBtotUKqYw80VVPGZdyKjEAyHazPfnyAc/Nsano61BajqNJu+lqahzO7KQzIzMDY4a/Fsc/e2dKoS/JdGcklQlDBBB1YjfFOkgZtrRsu31elnHyb8Xta+mcrQIxNCzdyllpqeX1O692ZRbIOQoIvj3HNxqb1Bi6dtk6sWQ/UxCOoqZoBhNoKtewyRwfP99ZKlVjJ27Eq6joJXWCf8QQsF2lTtVrE48C5GDfxp47qA6SMxLE9DV9qCkl7oYxoEOxI/v8AJ/Um+umMUQbf0Xem9IaaP6uqG7N9rZxyAo8Wvz/vpHLjkR0uWsJVdU7lVHSUTRKsB2uXT07yLgXGBYZt486WMWm2x7VUjyLoUEFM4aRnIXuGNFCl2OMWF7c48adzZPilbO6OkDPZGnFKEX1MGxfnLeeAPbU5dNvsePdLoqQRpFESAqO77RKT6hj3+2l9WilemLVfQfr1CMzMyOG7tyPm3tbjA1uX6A6QrVSSQSwhpIoXWTso4kbYw84PA5F85x8aXjWoKdqhjpnUYb9pmlgKN23haT1LnjyNptuHP30EtwLxDtX1BozJ6qZpQSkEsQurAH1b7ji3xe9rXGi6ZkmjGrUoOoSM0Kybjv7SXBYC4BBPx59hq0YusE5L2fdXqHpemxvDGBBcMCGtsa4sT7m9jn208FbqTEniwagkhi6OJqyeM1j7QEAui+7bv5SSOTf7aHFqTUeiLbatitQ0n1S08LBqcvexQhGYEAsx9iATYfF+dFN02wxfotdWp4KG86zxmYsiyRE7/wAMKQAu02Fj8C/kY0PoXxt7ZPq6Oo7kcM1OYSv5HaMXve5P3F+f76rHyKSqLKOFawVT9UKhuxIAZIbs19rsfOQLX/TgamkpN2PO4pUz16ibpxpWjdkd5GIDAEKy7bMb3uCT+a3GlS53+gJpB+rdQZ5oSIZTPK/4e1lDyKzW3W8Ne3t+2k8XjXaDOVLQFH1fqorZqenBgEEZkc7h62vgkjHz+trar/HH2Jyf0Ny9R/xOnEN5hNGUVlQ7SP8AXdck3/vjScHDexovngSio5KXqMRmp94ZGbYWLWAwSbAWJwABz+uspppphcHdlTqk5qYGdCEABCyiyEY97f8AvvpPZRVR+fVP0tPHPXO8FVUKhCMxZx7iw45t9uddcU2qjhySaTt6VKZ+oUne+nLFXVGVETcCQDndb03A8HO7Wl+NSNG+Vov9PqUooGaohcERhNwkA3Nzf7YFrf7655xv8S0HrskvXiqmnZZo7qoLmE2C3JsM4tjOtGLdKjNduxDo8kclRVVG1DC5cxofyMQLXOfJPA1by4qQsNdlLp3VO51J3iAWpPbilYsfSDcc+Qcc655wcVpVST6No3XiaSnhoZIjTXs5lT8UnJsQOPPnUbaRlFcm2KVEzU3SlE0bGEKXt3NpLHIz9zxbzopcngV8dZj6ermq6hXj7hKG5Lkk7jyy+1zj+uuhRUF2T2Tw0fQaeKmikd0nQxLuLsu51AxdSfzEWOf99Tk22MllEnqtTV9SE9HQd6CFTaNnkYWDebk4tbj9tUg4x+T7FkpPEj7oyJQTmh7hZ7Bi5s73PJN+f+fjWfzfI0fhllmunpen087hNg2Ykc5DEYwOBb28n20quTwZpVZMoI2WoSSjiLmzEozljuJwQwwMc2086laJQTT5Ds4qKyphWWESx9wFY1bAv7k/IAz4ve+oQVJqzrk71DTVy0pE9TVQTSKGayRFhG2bqv8AmwLaZRvSLfojmaqqOkBFTchBlMhYGRS5vY2JHtzkH7DTNfvoEE6GW6JFIIVFQ1M+0nvR3TBuCpBwef01LlTK1aJFLQ11PWS0KzLHSRuSs7Ebg5wotgLcXyM409poVWsXR1DRmmqIFkCVTRsRIqBiAQLm73xzn7486Lk6bMl96WPo6aSklhZlekqULbGG5mLf5fJzbU+ckynGNEabpkMkLRdppGKKy7iQW/ltY8m+qR8j7FcElVHYohSou5hT1En4fcIRy4HtYmxuP6638jkI4Qr6PKHpEzzCpgo5pqiPeQUuuTa7fLeP1OqOfHsWMF3RZqelfVb5Fmld1XaI5yocj4wB4uftqPJweFKTi0xSmlihMaVEM80bsVTthSXJyx+ALXvn2+/RPbccOeDVcZEzrdPDVVMUkLBkEbMEGNga4sTexJt9hzqXinjsrONVRKjrHrpO2Y42iHq5vuIIIJP6EH76qoUqTJy16irLPBShmjjffXqFf0XBNsLa17/Y5+2ivGkrvQN/oXp3eETyxqXJOw3HBB/N7gZHx41l1rMrTdHTdYJ6kIoiKiBI1uzrYB7n9SPj540q8doaU6x6VZ4oa3aq5kuse1AWKC1xfxbzi+ppOLKJ8kIGmO8LJGoKt+GgfexHnxbkXxxqq8i7RNwpUzRUFLT9LoYbVJatAfck0hCxi9wl72vY39wDpJ2/YsO6IdaKp6dWjSKOGocCMIu0gC/7k2J0UlZra6IfTqCenqexO5E0xu0i2NjY5A83Gqxauxdqi7QUVoJCl5WQlLquzHtY/wCmkm6fJFYKsG/4V6c5qJZobNT9w39Bdt35ST59sm/PjUfLO89jQWNovydihd5UdRUMCqLs2bbG5sOMgakm2hsA9XhqKwiZY1mXcG5F1AuABm3k+MfOtF6zVaIfS4ah6olVFmJtICxyBjFyTb9Ptq06qxPH3RVlo44+80stk2hUspEaNnIByTnUlNvClVqO4V7VI0neLXuUR5N5t5Fhb9/v7aPDl2MpUQOmTtT9Sqnkfu1ZUjY449WbMPIHtfn9dVbqJFRTkNw0datX2m2TK6sNgvtBHBDW8k/rpnTX0Km4s9paus6bJLTPtaFGupZ+1tGLm5BBsbAAj+mkdNWhlY7SdSiLyyStGtRCDw+4mwze/wCuf00qhV37Gc10iYDURSu6LGIZvWUkJEljck7uFGSbZxqvJVVCqDvlYHpdU1VQwrUyOzlbOBYJEfhF9iPfPOtxSYE2xuUpLCxaYTJE9jIXP/UH5+LA48c6g0+VFE1V2DkhgmniP0kcO9THbebQ2ycHGb8/8a1NZYVT066fC9PXzmRFFO5aJXDW33Aa7Engg+nzz76DcX/YYp3YSgp44q5oIkG+FdyTNFmIHFhjg5PzfTRlGvkCUW3hSkoJOoNGk0TKquJGWQoSXwcn2PsfbUk2tQ+PGdnp0lTCxEX5G292QCw9gR9hex820Yun2K1eDy0JWOVmkQww/mc5d38AEcHIJ5tbRkr1AT9MDE7VXdkhi3fhntvI1u7f/wAiL7BxbxppStUxUvdCUdVDIQgg+rqIyW3Km0oCbnJwPHjIt50jvv0UjV6hVKdFiFQqtVTsd7WWwQEk7RzgYHg31ou1XRmq+SJAAjq1haljhViiKLhgjhW3WC+fPjFr6qoP7F5pLEFhoYKmCR3dgI6lygVAGIUkYtizfHj76ZT6QOHYfqaLJDAJYkaT8wuSNpIPqa3I+37aSMmm9DJe2Fpem0HTbiRTJ4mDi0YObMGtdcAc3sMavyv2QarsZiR6is+mo5KZ4t/b3SgkFPG1sg+4+/zqK/ZRSyxuipoo6yqkrGCxIAqjd2yt19YNxc8jPAwdDlmdhat0xUdTpK+qkSnhhUizx3e0dxYF1Ci+bZPnQuSX2BURep0UrfUhKVo12hZS35nsb3W5821bxyWJiSi9aB1VP9HHHN2o0nUL6SxYqT4A/mb4zYaKe0ZRdWMRdQEEymQvTgq4kSwIBB9QBHJzyMi/jSq2qQ1JFQMjUkEnTe7Iai4aRpCqqCLEEKTxjBtz451LVjGz10E6VSk0kF1Z6qOUxl1lLBRfLbiMC/vfi2hdPTVelKsCqKgGnUPLYuc7mU4AYj7Yt7aCluDcbVslqKinqomDwiJgCseQ2ARckcaMaaBqZ4I6urrXdW2xx23bifa9x7gXzxxpo8UtM7vD2eSB1kJlikLR2s12BGRfxYG4Pg+ONPFtOkgLVrI/TI2qK5K6ljQdv/tPe4Kn0lvsc+/jR8jXGhIJ3yRrp6qLp1PKy0ncqN+9IrsQf8osMC3Nsag25OrH6V0JhJHiDzArMkarucA7iRuNxybAYHz8aPWWBaYowyP1Kd4pO3XzJucrhku3m3BFh78a67uKvoislnZT6NT70nFbG1SIm3O7SbRk3Gb5vc+bXFtc/k9NHT47dxkU4YKZJjIA0byHtqpiYgpz48DnHH21OPJqmPLiv7CVnW4Wr2gpVjrNjbe8xsoJbJt5+bWyQNOvFJ9sTml0iX/E0Bkp2ebbTTQWjlQMXPqY2K+AGNjf2vfSRfCVdmkuSs0b0lNU0cAkeSRGitGFLMxKsPPOLWx7HSybu0MsQnVxv0+ZK2ZnUwTdubYbyLG9rbgP5QQPkC54GTG3/wA9itosvD2y0kuza63iipkFxa9yw854tewGjGqzsVsAtQIYpHjFVCrgYkUBQT85uP6j20JK2NCuwkNS6gtufaF2StMRtsL5sP1sAPnVFVUxZQV2mJyTJ2HlgCpTyMxso3FSptcnyb5FuMc6STb7HhnXRNrZJFQxq25pblECkWOcm/F9JEo+mmI08siRDvxlJ3YTM1yh2+4AwRi2fbOrvjVoirttjlfWNFQRVMVI0TiRTGioCpBOGJF7DzbnQgtps03nR7T0c0skgEkcIBLSdo7mLW9VgbgADg2vzoqugaBqPpU60I2RUljKT7f5ns/BByPccG2j4lti+R0qLMdFuXvNMZYXYhV9R3erIPxfN+ODpu24rKEb9vR56iKGslhh7DTL/wBxXf8ADjX4HsACbHkm/jUb9spXozXU6pXnSWAbAiyJErEkFmsrEA5YD5wTb40y6oar0a6RRL06nXYm6YEbXMasJCt7m3JubDxa2g3yywca/smdac047DRFaioXuOJH/IfbaOOLADVPHblnoEqjDRKp/BrkkkR5DFtCpGdsatewKjk29+f21SMcdf8AkVtFodJ/xOhYxU3YkdQm9yFsLfn2fb3znUb4toZO0ajolFT0KLJKkMIFlu97n9R6V8/mF/0xpnNtVWk60R6jVx0wn7McUghurdpLooufnJNuDc/bUfy7KxpdEf6+ok6asT0rRrYISrkWOSCeb4yfGedP/HUrTMpWqYr0y1dLW1dRU1DRKwBZlBCYyAByBbH31ZrhFRSJJ85crKyytR0btT0ZYhN+2wbZ4wntn+ttc8q+y0baon9SqqdnkFbCpAXdKLEG4Fv+LZ99CKd/EZ1WiXSIe7XIpaKKJ5Ce64JYeQMD0kn7Yxq06jHeyUVbzo1HVYDJIrGVWCgDYgIUZPqAGf8A22oRljHcU2KdNikkLrI+95Npu7elWBt59hg+OBrfyJG/jbCqYKeprTA28s8bZiuoA5tf3IJ8frzoqMmv0K2o39n3U44e7Iy0kkhiK7IwpBmbkXU25uTjAAvoxzGwydkfqlfU9PrkWdkDMwV+24dLG4IJ/QZB/bVVFbQnJqrK/TqagaL6mjhQ0tOrlmeEB7N/myMkX4tYcedTtxesf8uhSoQxvBWNGW7LKJFZwWkAuFHywuRb2Opy7KR60v8ASqEwwyzU8jRw1CsV7iYQg2/J4uwPNhjnSxtAlJSJklN1BOp/VpVy1kAKsUqZQm9sizEXFrEi2MW1SM4e0K4SrBegSLpoWGQrvRpJZbXEWw3K8ngG4vjjU5SUng0I0qCwVglhNQ7FjK11LeApGBfi97G2tXHBu9HUnjliVZWUKpYhSuxAeRe18/HzqkXQjV2zNVtW1JDBNTQEQSepJGVtrG5NwLc3uABfTQ8b9mfkj6O6SmrKh2qqiFYAcrG8g3qfZwPJtxfjSvjBV3/6GTcnaz/2dp01zHK8kbHdZu435t1/8ig2GPPN9aLvLFf20NlFrkljYLdRa5m/KVNiQFUjdjAFsA61VpuXoJBUz042rADUdr0NKL3C+/Fzfg/OdFuLVoCUvsgxzdQreo1WwwmQhbsCbSIRhdwFycn/ANGrqMUuyEpP603kkzU1FGIpBPOP+2+VAPsxGQBzfz+upN07HijH9WnjIZqiOOOfb3XmAz8A/H9sa0Vy6HulpkxVq8cxTuBZLvExYsIwBZfPIz++b66XBZZJS7KlOamTp8ZLiJ5Y1Lxp6gARYEi5zbkcW8an8U6asdW1aYxFTz1lTF9TMTUXChmHPhcYvj/331qCbgjU5OpFKh6QZ6x6UdpJcLeQkMRexCr/ACEfOD/XSR8rqhpeNLS9Mi0MCw1NVEsSNfuoLlQDwLXz4+c6TnXSAoOXspTTQR0kssTNuhQvDHtULuYelm3A7mIyAAdKpXrNxaINR1WomWlp4pyFiX1kndIW+/g5z++mcU7DF10QOrLGIyJpO8s5UmMEKZc2Ia/OfJ/bVfH1noWVaP0JNNJPA+1Z0Owyx4UkDNhcDwMkDjHOj+UVIRWpNI5i6vJLSVjUm54GcBIwhMh22Bb4B+Tz40vkik0mPGXbQSjpVkpZ4qllkljA7gbJHJ2kj9ONSupWi1XGg1DRzXM8ksf09rCNdq7mt/MRnH9dbyST7EgmuifLXVE0k01PJ2l3CPss28ljfwOCeLD2t5voQSumCX2hk9KqYlSephM0PaAk7jGMG4tfbfBxwccDWhOKbXTNKDoq0UX0lGkRDTWB2pHvZXOLm5/uRYfbRk7doEU0tOKaCesqJIwQgVN5keQk88EDkY0IxvGFyokV7mpqkKq0KFmErzpg29Klr8erPHtprpMFHcCVlF9NSUsc1Ou4GZpDcZOFwDf3+daTi7cgq0qiCov4jkg6vHDVSLUMScJGAz7AWLgA3Fzt4xYgedF+NdoVTd0OQdW6mwX6SiqnlkJkeTcy3bIawNxzfjFudT/jS7Y/NvpAaOlquqpJJU1C9qS6bAdx4uCAefNyQBbjk6LioKzcnJ0TOrwVHTqOKmkjaahpgu2aNWWSNyL5HG0C1jk250yW2jbVPoMav/COpdqrkSNngE0FSWOyVeSufIPNuedCPyVpBfxdM7qOpyTNEI1JV3VyQSN44sAbk8E/JPi2tGGvkbn1RoqGBJooYZDIJ44ydiRMQLC1gbC5Fxa3N8aZSu3Dog1WSLaUEYp51Tp5ftxspaZlKKwvayDm3ucG/ONCfF9GhfTM8YK2qo6lJylPNZFUxOHRnN9wK2ta2Li3J1JKMXaZdNvsl0sT1klM4g+nN9kncIUswUgDb5uADwNX9Y7E94N1lbDC8MTyLK7yMkpIO/eQPyjxjH/ttK42vo0XTB9OqoYenrR0EZR6feDEqENlr2vyVz7+NDbXIMa9DiM7x75ZzCjEvLAvqZQOGINgbkD7W0ypZ2btkh42qWngp4qmaZmu7uAi5yNqnkc3++jF1pmiMO3S1ErGN0DHbu2qSHFhbafzDi/tqz2OMlGlLUWqJJK2leFyiU7AyJBs3bPcscZv/tqDpdF1/QxBSO3XYWdCqIoHckQMsgvjaBm/x9tI55rG47SL0r01AZISqkX7rJEtmCjgs192TgaZf9xJ90S5q2ESyU9WIYRInqBwqG+Ac/YnFtBwb32NGSQrPQNMjPJ+IhZFDyL6igySNtrYF8aVNp0hvi0MpHSQR/TrOe0GEt959IAsbEC4Pj359zp3LbEjCkRqoxNNI4jMjqhbeyhbjdkADAN835/bVfH+wSWUcSU0n0sz/wDTs7jIMXCscWPF72/rqkpRwnGMlY7QNT0MXbChlX1TDMZRjfOMc+PP66jNuTv/AGKwSiqsA1WtZXsyVUqwxKEaP8okABsbDN8nPt850vGSjbQ3JN0n0WUgXqNR09aWNUp7blVwdsS3Jsv+ZreTe2OdS4qnbMnWnJi+jp6gWRRCXc2Uh8m/5+fgjQt9DUtwza/xw8ovNTSGlYE+rcrNa9ipK2vjF/09tV//AC5+yb/6jS+telV09Kzp8bBns7SFw+2+P3uAOb/bSJPnxkM2mrQ3DTP0ilp17Uk09U+5wincGb5Awozn7D20H8rRlmidTDM9TOs6qGYqiBP5QBa4OTfxe2OL8aaCjWA2ylBDJDB3vrJElQG0cT7iFyQtuABk/wCvjSSa6Yy9mV6N01KiuaXp5EVPYNK8iEySuBmwIx+uD4Grt1H5kkrfxNP06OBonMw/6iVSGDMVW3uVP2zbOpuSqkNwpg5TFJLGjktI6lm2IY0KAc+SOOPOl9WUXYNXp6qmSOVyo37gWO5nHF8/5sD30eLbsWPkSTJvW+nyN3KaZJKVgySJI5RREQObZJ3AkG2bDXRBRT/ZKUm0JUnTpIaOV43jhqo2dQ0wLGQc2Ui62t5GceLHSz8m/oHji6emjojTxdiaZ4+nUhLNHFEf+420qLn+YXAwc/ppWq6M7YWi6y0MKyopdSUWQFipcEfmBGcWwvBvYaXG6YyT7CVMqO9dBHP2C/bC39QCkeb5bOT4yNaP2jNuiRGtJ0+FFqp+1JGGkVEUOzLezJY+TkmxOmUeTfE1uqYiBFTrW/SwLDA8aKko9QKhmJK34cYHjzoqV0paDj/2lPo8Pdp56pbdwupKzJ/KMhTY4vnzckE6Wdr+h40zqumg2o8lxK6gKFWxvcW/r/e2kinLB3S0Xpg9O00O4zpMwc3csWZScci1/JHJtoyuWdUBJLQ3U4DLTeiCOF7EbJlUoAbmxHjydHxpxTsWW9A+iUcqPvqpAIREqyPGCFcEXYux/Mc+LA/ppp19Cwv7KUVWsdPJWRRpskZgRUOVKLfG0c3t6jgWvbSOCW2PyfVClTWzNTTyQ7Ebcq+hQXN+AGtf2xxjGmglLsVtxxCUUdXVTmpq4o7Im9VF7W8gkeA3ve+dVuKWMRcnjEamsrY62nUNv3BYVhHpxfmwPvf3tzox8fKLdGc3F1YKoU1VU0CTATqLMJXaOP2Hptk+fJ99GMGldB5JuhmWVOl0X4QRlsQW37s2tYW83OL/APGg238RlS1nH1DLTvPNSPCTmRzkg8ZTi5vxm2pyTvuwxcfRzA1VUS9imp4lXaQ4nj3qTe5ZbHm1739zp01GO6LJcmkj00Jqqy9KCjX3PM5UB5McXsQLYBHxpFOlTKcbeFlepdQnemSCmZJ1vtsVcE3yWucDNve/GkUctsS/pF96cTUERnaOXuoDOyOdrgZNjyf+c86hSUnRVNtaTpKiBKmNGjDxOwBsfyre1reBm3x7aonLtMV8eqO6laKK0dLTxpKZVu7qXIyDYEgW8XPsR7aXlJyGivifQJaV6iWNjUuyBZFJbtvcgEAWAtx8froullgSvTqeQ0NPJ2wag7RFtYelSSSTc5AFhxgm2li07M01pm+vVk6PFTUszSQSWZiUCsCTx8iw4x+vOujwRUrbJ+STXQtT1IpIyWlklZkdt8cojsxO4YscKTwPfnV3FSwmnWjnS6p+ouZaoRKI7ykpISS3g285uOL6j5PGoqkUjNS1lIqxdVEYBB32Zd7pf2AxjnjzqSa6GZNkbfKlRFVrJEp2gCMpvza9+RjJsBwbG2qRk0uLQjje2MU1JMkkc0MMZ2MJHtd75Nvzfm9/vockw8MDyPU1tE4+jWGhjN546ZQrF782ZrKLDx76aNXXsVJ9MmydNgHSkpK2aarpBgCnhAjc2IT8TbfepNwcg+R51RT+VrGJwymPVPSamnMcMM/dp5iGK7Q3qBGRn0rgnnGcaipq22tKKLSLHUIdginNlkbLHcCTYZJPJNiLHFifOkSbY7aWGO6v1kVjPFDRqlTTMGdSpa4AJAvawwL31ZQSV2Tv0ddKLVMUUNfJMwDWIYH8P+YrjObAjyRf20jlxYVG0aqGWl6azI8cnakFo2XO34+efY8aDcpDJJYedQREBapjXvlkDIpFxc4IYDn4+fm+g45hlPWZOoeSip6pooqjuyVTb3jXe0a+CBcgC3+vnVvHUqv6JzuLbRa6c9ZLSy/hvEYwrRMYr2BsdoHBYDNuc5tozaWIHjTa0D1jqsUSGhQOYJd+9iBExsLjd7jAv7/ONLx9p4Nf2tHayonk6fEzvcpCC6LHtDxgZFyTkX8ZNudLxV4hlfsGtN06oeIRXaKNi72B2qbWta2Qeb5voRbimGVSeIBJNsp2jhPa3yKS8oNht5BtwLf31RJvaFxZekylijqHLtUTzPGg3BRlwDYEHJ+wGbXOdU/k+NCqCb0EtSSa5pCqEn1NKhaQsT6VJ/Xxo8r6Aodn1oamgSWY9ueMq88kZLA5zn+XwCRfnxoNtOjVljrzS9tZUjVIgCVeXBHjBucHJ8c6lx/0lOS7BUMEpRpoXjleKSwN7Jk8EkZOSfY6aSTfEEXxXJByJJp5DFFTh4m2yBkvZxbcbDg55Oll46WgXkt4Ei6KsNV9S1WEtIxIXcAebHB9IBF+c20jm+NUOo7Y1QdSapoK+npqXbJ3rdqoDKZARygUcG173976lx402UcuXQdkHSkJZI/qE9KgD0gcH0g3Iv4HOgnKYMjg3PUvQQxFzKVQ7t0pQSlDe9l858c2tpvHFSVvsScmuhHrnV4Y65YRKwWGwJ7bbW8bsZwcWv5POhGDasZyV6R3r66VN7speW1lT87kZDN/l9rD500YoDbXfRB6lUTlHl37oEIJDAEsxtgeyj55t866fCkvjRKf2XelU7VCdtqZTGik7nUHz5Jzz+19L5HxVJ6Ugr7QxSdGRDRPMib2kL71bYxxgNc4v7/fSPzt8gfxVTHun10MlQZoJH7URZE2hSxyRb5xYXPPvqbTX9jrezioNI7RAR+lCEOxSbAZ2ge1rDzgYPGm2rAqukFq6GnMgYySbV/MkaAerx6/bmwP30sW0FpCFfPU1sTSWiipYnCXMpJI4uwsd3p+B/fVY8VnbZLZaa2ohoVkip4oy0wuW2WBUeCDe9ybYHP2vqKVPCid9mR6rT11D1GOV0ljo4mEn1CSBj3HFghQ+Bn1WOWAxjV4pNEm2tKp6qoaSSWl7aFgr7YGlNwTZnJBt73/APugov0FyQilZQ1STtQzQyVJvGFsrWA9rHj2Fs3t40zTqmgJ7jIEPRK3qnWJZGq7TGwE6kDaAbgX98Y+x99JKSqkiqX2aekp5DI9LLTl4KeD83c7YU3vdic58WNj7aSLtWuzVunEDP16WoLROkJZR2ZDtcOvpZz5IIOLYH30zTWC5qNNUR9lII4ZFiaT/ukuBGx27cWxYCwv8X5votW8EUmkT54t5EgfaEbsbldgz+Noa4BvnB41rSxBVvWR6uik6nTsGgEMnddkkYHcuRb/APzY298eOdF+TjthjCxaesg6HRRLIUfbKiMrvdRIbm5H2ta2dKlKcsH+MVTPYK0Sb5ZpQhqGuqqLWFsKL4uL+c+dNC0uNaCVP5WU6aGFljVZmh37QkGGY45N8ke9zpubquxVHbCVcUUBpxKszESESAWO1rZO4c2+NRttOikUkZWt6e9f1GKJXBheUoSRbdbIO7x/e19X8Mkl8uyXkVvC/XdBnjijgikd12hXslotgJbJ8KSB8/vqcvIlIpGNxBdxni+o7wWnTDx7huUe+0+PY399GUndAjFJdjP00JVaKmZCibWZjll3G5Hxxzx9rak3K7Y6SSpBg0ZpZ6hjJ3JGIMli4ZQTuIUCwBsck86d+WYkfFH2RerdTnBano5lVCMpAoKqpGbseLYwM3+2qeNKWtE54qTO+h09W1HGs0kj062KRXzGLYsTz/a5FxpfJCKlQfG24l55paeKWWOJIpdxRO8S5OAb8cfIH99RnXSZWPtkN6z+JIqiDtQU8nauTVKptZgdy3NxcAX5xY6p44eNrvv0TnKTdI7qKmSnaCZWiMzEqjRk4ZhyWAtYDyb6RJK0hlvZm5Enq55KfvI+4kNGzHdzbJHjyddEVFR5CNu+Jfh6HFSRQuqx7d4Kqi/hgKPb/wB/ppH5bY8YUjmllqHdwIY3p5mLNG0vFjki9rjxbWlGLVoEZyTplh41Wmme14toZVA3bjwSBkH+2dRXZVvDjp8i1UFVDAYnIk3LEvo2DaDa9rnAJ8C/2vo8WpK+xXP4sOnT4qmkD0jKrbe4rTPusDe5zj+3jRnadULD2JSTInbEUkM8ZsTFKxDZ8qObeb8HQStdBuyr/DXTqKemqpFh7wk/M7flPkADx9/nVbTVMm1TtC1B1BqeBWr5hF6i+wtfd53E+PH9NK+6gh1fG5FmkK13caeUHfwm0Hcp4G7gXvz+uldvoDpaTJqeLpjyJ2ldllH4faYDFzmxtuIt+uNaHkbdM0oqrRiquiouu11G/Z7Ul3USRgJIB/Kb8uo/8vfXSvI0m0Q4bpW6dE/T/wAN6oPUQuOzeJkJHh/T+Zs8+DqMqk1nZ0RtJoNUy/4dCsQ7Pflbd9S52qSSbXByTySf21l8ngPxPunSGWKzxhCVD7o9p3p5sxsTcXsMc6dukkBam/ZWm7z0tqRo0LqpLhje3i1z6QBb+ugpWxaFulxrH9NUSrTbSG2PG+7dkXfIv/fn40rjtIKeb0L11TUUs1W8SIyIADvBPcDN/Lg2xp1401oeT9EPrAFSlcogY1Lqq3Is2Re2L3tYm486XrbHr9CvS+l1NFMtZUGVo0beipbYLg8E5uftjAt50/8APFx4+xP4mnyNtTwSjcZy8s8UYAEwypOBaw4Nhj+upqSoZIm9UhdKpwwD2QSbbhdnwgBOfk3/AKaWLS9BeqxbpFNvrKFSrxoJBI0ZcgFjg5P+vvfVJUouhVh517rsNHWzUkI/6hCpeVnLqb+L8Aef0830PH4+evo05VnstBoeoxfSx1byR0+1pjDEuyMgG4ZhkEjn2txqcE1rVBm7ywtVEscUMdNBIkJC7xEAzOgP5QTYLcgG3z+ms8dsydqkTKtTavTvju1PqIT8kK8Lzzf2A5HGilf+A9HVB/Dc9RNNJVKtPTREdunEt3YDi9xYm5J4tnTy8qiqiIot7IstW0dJAKRJI2gjv+G+dyjJN72HvxqTk5PkNx4qiJWdcgirVeKudVyY/plUszA2JJt6QN3pxa4F/l/HCu0LN/s7hrmraKoLNNUJuttkU2SzDJFyFewN2vkC+NNKNSBF4fV1Gm96SNY1o3Q9+xYNG1vSSeRyM+b8Y0iX+r2PdYd05pYYqidHDvI7MSpANw1s3N91yD+vnSy5dDxrtBu9HDFPG8D3S8liRcre1/Y2P/HvpYq2q6NJqm2Ae01MskiQrVkXWSVg3bUtg7Ra5t/T7a6lFLF0cspN/l2WV6fSChl+qplPaNxeIt2gTjafIJscnUpPaRWGKzLdc6kn8MdT6fFT7Ed1lBT0nIXafHpPquPBtqvhhyT0TyT6Js38Qy9Tp0pKWKnBbaHmYEsR5bOLff3Gj/DxdyMvJapD1LRHufUdQRZ2VLqioVFubcnix849tK5RSz2OotvR9P4i7+6CiVGNiSEJBQ/ri1uPtocEnbM3yVIfEDSo4eFYqXfuIb+b3JPk3t8akuhmdzTRUiRwQyyxiRgbwAAgXza+L2P7aKTQJUQayV6lvqKWWR4YnMPedBIWXg3H8xuPHNzpkldMKZFDU0aVQqpZJdqARgxAWbxcAXHJP21fhKqiS5K3Zb6Z1Sm6Y7rNAQQqySbU3Nx9xYDnkWsdB+OMss38jQuem1nWeoxNLLshVC5lL2JJyDa+bAjPFsDQTj4k7D8vJ0U6uuakIhp2gQrGe44XdbIwWOQDj7XPxpI1NttFKcaVjlU0G2joEiWoieNWu7FQmPyni/m3i2t4ou39kvI7/oN1FRS0sUMStti8KRtC+CQcC5IA5udNVu2ZOujLTwz1UhvuWAy7mj5FkBsB4HkEDVMir9g4uTpHvTnNdVpAbmBNxJVg22/POT4uupeSFK0WhJMtXU000UjooDBZEALWN7BbeAbcf31CmtY1oo1/T6npNK4jpSalECoqqdzi173v5Pge19BM3ozG41MkclREHYOrSwzKDdQCdpsRc+ce3GqqUPQnGTw56jQVVWGnpZYYqpGsl1LOR43XxfaOPnzzpk11WGp1fs86fQU8nUZZmeT6wDd3ALAgjkrax4NvGdJKcoxpdMaMVOVvtFap6vDFTvDAB9PVMN7Rxbc2Kqu7/MSP0GptNhVHtT1Ba3uwrA8qndcoo2gceDYAHOL8c86MU6tmaSdC3Ro0DTiFZPp4XBYNm8g5sfbz+2qTk6oEIqzUTGREDwqqfzPKyjIPKjgj76gv7CZeSnpavrclPCFkdb9x0kLMASLeCOeRj7k6tB1H5E5d/EeTo8a1RSJmEVMm8QkbrSXIBsMmxJPnPOc6Ntq6Asxso0HT4lppoi5gcyNI6xiyOTcAXucAHgfbjSTm4saKT0iVcElBBMj7HpJL8GxNhYXuPc/PHOinyprsZ5jBSSfRxbamnEkjR7RHGN20gZbHjHB9r6yTka0kcdK6h9UY1qTA6ygFEGW23BFlH285+2qvxJXRH+VtFXqNXRGenje0iK6rJEsdgpuPyk35AF+Bg6aEGkI5p4H6vIQ0DNRVNShlW0YIdbEjAAIIbJNgM2towjFvcBK0iF/EPRKiv/iCmWWVIKGnJ3C+Sb4BHgkBeTwdL4/Iop/Y7i5NbgtT0zUHUFpt0MauQLxj0lTkkYyL+Of9DbmhsgzUSdPMlPsjdo5Zdu0taygD9jycfrrnVJ32V5NrAMdG/S2CR06tGQBuVArqfYX5J/S2dHlyMl/sTq/qU5p3XeqowVENvUXz4v5Gqxgkybnawm1v4fTVZ9n46uHkdyDAADj9zyDbOjvL+hfWnEKxVdPBBDFFBCPXtaxO7wm0YuL3xxfRcuLb7NXJV0hgdLjDvJLEzTTLYSyEHd7FgDcXvi/FtBzfroMYJdhEpkWqCVDtJI6bqh4fUSwOVJNgLfF/A1lK+guK96WnamEc26MwzNwm25CA+SMA5H76lNOx4NVpPZpJKmVQd5gdm2oxsRxknPm1+Pa+q+OKirFlrpAlq4OjSKK54pYGARWjJkKknBKjwBYY++jxcngjlSor0/V6SumljvUU6Ad1TkCTjnza+bHOQdTnFx3/AJY8GnhJq+qx9RjVkYJShxvUAWDE2JDcH9Ob6rGDS0zkrw86fS0i9RcRMu0m3qS4fF7nPA/98aDbkqkbI9FlDEHZ46SPaoCvI8jMbDO61gB7jPtzjUmsG05qK6CRw8sonjB9TOSuw83BGSTjxpOD6NF/YpFR/XdYBplTsyDZJuZdqNe9wLcf3J8an0qKL9DtXSRU8UhEkYCDduw5JIsCAM8C2bcE6CbbGVLsjpTrTmWEMLvazED13H9rkC/jVLc1/RLIf5FN71jiOSFYGT1kxqGVSDYE5x73sdHjWp2jcm/i0UHSpp6KdIz9VGoyqKFBW2WGceRz5OtGm9VDNNb2TugTlKMSzLI25d4j2k+oXtY3Awv751TzJcqQnjb42zSyS1k9PGsUmz0CNEiG8c+rJHJx7ag41g8XevESoUm6PT1NbXTolKGuZF5kBOFLZtc8Dz7W01qVRS0DVa2OU9dFebvvGsYY+gWLRseAOM2sbaMYuSoDkk7Y3UDuOYFV1eRmu0r7FCrbgC/m3Fs8nQUZvv0blFdClWv+IUZhkVSsYszoblycHIIsSTx7aZJqXKzck1xfsnRKsUsgiRjUpGBH/wDrWzencWFxi+D8W06Wf2Tcto8o4pH77UbiNwpBCXIUbuATzni3tp2/snVIPQIKmaSCtQ08jGPYTGAZUxZg3FzfznTOS7QtFGASVVY1QyyIYHsq7rqXBIJuBYj7e50yaS3sDX0G67VLBWQ3YRtK22ZlYbmN7YPPsAbZ1FJNtLSqbSIr0aRVp6hUzyNZjYr+V3F9oY++bYvi3vrLyPjxig8Vdsrp1Az9PMtNUqlRsDbcmMDghfa33x50jVdjXf4gIamb6BWlqEUwlt11LCxGADkY9xzrcUpYFN1plIlaWtRpu3YsWfapNxbj9yM8/pqzxE4rSlH02KuqUipZBUTJ/wDrL71sMgi/2v7Y0sU2FuglHBBZyVM1dA5EayP6Y+GHGLeok+fFtM48fYItS9DlRTv1GRyjKScliRYD7+ceBY2tpFSspWBYqffI3bRpGgVVZ2UrtJBuCPi17f8A3Ws1YK9RpXpkYzVARHjchdvoJFzci4NyF8Y02WIif0wSMC87BZKw3I3gFck3J8k+NPxTdIKk0rO6+O9QI3g204UswUn85GAo8klvPvp4RymSk7fIndYjujw0qTpFHKAWdtpkNgGIPtb0/GqceL/RLleIQ6XUSVTpuZwsziIQQ4WRrkG4N7+TfGBqclnZaDvEfpX8O9FjoiZ6ggy7N8e22xhg4FvTb51zTlapFkvbPIkX6swxyo8UKWMbMHI3eCARubAzbzbxoJtoHUgMpEEyCaSNAxPZBQAxi9wn3DHycDGl5NYxqv5IVqpJFo0Vwqo7mMb7qVFiNgsDexyB8DS8V2ZSd0ytHXuaWQyyR08jMqyxinIZb2HtYADIvz401X0Km12IdbpVEF+xTTPJIGlFyFdQLBwb3B4v7440IrqnQbzdEI6NIu3IYhz69iqS2Pf2/r++h26CkqGZAailYmRma4JQE2vwFAtfFx8aL+kZbrGaUL0qMLHIsYaPawYFMc5t/X/bSSUm9RRVWHMVUtTA8BZJY45e8EpmVTYHyxyov5IJPjRWetFpu3Zkf4lrHqaYxVEhnRapZGugx4HpxexYWufnVfAlGVpVhPyr40W065RSU0aCBAqrYQTD1hgcuRYk+AAD7m+qS8Tskp1jPOm9ZWX6xXEMM1RJuheyuZLWtYk8LbBP7G2i4tO16FtNNM7n6fBS0ca180csasQqou5YQM2uTcj9s/bRk71exYrKfRLqWr6mQmC5onUSuVj3OP8AyPN+MgXtfGhCcV8WO4y/JDU9OS0fbr1likQ+pMKUIAG3zyb2PlfbkJ/aCXaKijphH9TNUuXUJHF3QI9uCzW/Tz7eL6XkmqCk1pQWKFCvekmaUqW7QwsZN+Qq44PnRTMzHdR6rL1iqmhEdkSW++5UsPck5HH6ayhxXL7Dyt0N9Sq3pqOlWocNEnpuFLAj3x/8uPOkgk5UGTqNgOldRmnpoXZnSFFJWwK7Oc82sff/AH03lj8hvE7Vg6SsJkdo1kESIUQ7bC182+Lm9jzppeNpAUk+x+jpYWY7wSiOd4kXIsLgi3jIxzpfeh6WFCWlSOFClXTxRhbRI4BaPySDYWH++g50jKPojKiTVbN3I5UYn1y+pziwW2LC4x7WGhGbaHcUngeomamopu3uErHcWBBAYAX9hbF8Ytfzo3YONB6FIGdqokKpTMhWwte9yfc5/ppo3VGddkf+Jqj/ABeJkgjcMy3MgtgEG9/k/wDzTxVO5EW7xAv4fqUFLAkpAmisGMi+lSOR8Y8+dFqtRo7g71cLQKd80skwG8SJ+HGh8PtPm+MX+NaF+jSJEf1C/wAP7HvJX91o4ypLA34Yj+XGPnPnXRGUeiEoyb5BuhdKL08BgpKidIvXJMhuXG07yBe+bkYvfOozkn2VhaX7P0OmoHmihqJyjSFE3xiQgDwFxw1jxm/kY1yP4t0XUrRA61UQ0xhwgmllBJckHj8oIsDYA59taNuVDv8AEoxdUFXLDG88UhVe6tgN20DP5hk+1snzgaaUMsVP0cdTLwVdOlPTo31TqfWpYoOAxPAuDi3kXJ1NILuhtZZoIH70jSJMO3LvUMGsTc3sPg/rrSqIIfLsmzdOaoVpkIjmPriIFyovyPv/AK6CyrC33Rx1CjrIBuCPKzEbFyFC3/m/X30YyTNxaxlTpFEtH08GUqLL+L3FF83N/n2/XQcreBSpaS+sQvBA9QCZIDHskbZhTbBI/UX8e+NCLfKmwNJxsg0IWjUmjgUVEmXcNuAX7/zE2HxbVJtvvo0ftC0lFHXPCGO1Kpt0kaWV2Gb3BH2Hzc2PnVPFa/wL5N69l+TpnbgLxuq72Xe0ri6ixuMZOnl5UyKiwE1PtpbVjU7ojfgzykHYBixFsD2P+2k528Q3ClbPJO71WhamopyGLKfqWBdWXN1XNrZ+/j40sfIo/kgODl08OugPPNHKKhCJlj7cEcbCUk5IKre+LjIsB7c6pNRrkkLFy6sT6utVMhoDSRSy792+NgrqN18Z2huRz+udGHFfOzStriNxURWmgiirU7s9zDniIX3OPJuR5B4x76lyuTbWDq6qy9TVc0KyR1DrCWcSCOxIYADJbybjj50zSkrAm0zHLC9HUTwAwRh2MchQ7yvtYk5JHjPIvp07iH2c9YnWWqFOrVc7SA3JYsNtr3NsA8m/mxGk8Me5YNPKRTFCKVqedjTuku1S8psq/AZQRz8W1pq9ZoOh2paCSMvBKE7TghcP6vBOB4x++k5SZRJMXXrQSWSGm29yVfU8jELYcWIFj9hj50jg0rYyd4RamsWQyRU0sURnAXc5IZySc8G2B841RLLYr7wrVP0aQlYKJZIUUo7klpndvKkm4J9/sNZKT6wGQ7E6rpqwUsKVm+V0KgxItxs5K8ZAa33A++mhrNNJRBLXCYSKhVZUGdpOxW9gPtybfGumMK7IOdhqb6ORfxQ8liren8tyLbvcX9v66Sbfobxr7G6P+H2YyoklzIxZe1GAGHHpvz5ydTXkiPwaWBurxo0FRCIndo09DLKHksG82/LxznGNCMttGcTNyVtJLVwUbOVnkwXjJC7FOQCPOePOPbVU+NsDSeGmHWKLoFJFHCxEMAdTGkisS973sPI++L/N9TtvWCUEumemuqe7DFSwvFVyv3ZKgyWvcYW4Hta+g1lzHilXFIk/xW8U3UIY6h5S0MJaRY8jff0+rx6TnW8GKxfKrdC1NNNTUYmVqiKJyE7hRdgz7/mHIsfOdU4t3YkZJFiilquqSyRdwo6r3VlkckxhfNvIxwfB1L+OkU590UY+qvKrQoLsltuwW3k82B9x7599TlF1bGi16Ef4ihm6dTdwytLVRKCDG9lS2SCB4ueORYa3ipyp9Bl+IHo38UrSsKDrFHJCXChWppFJe9zbf97nHIuNV8ngpfERTvvst9a/iimqKW8EhpnbbKGljDBxyLC5uDi4+OdSjCSfQzpqxKurZKyB6F5giGn2mVD6fY88HxYm+sk1qMq6M+8EbJI8LxCNkLuSd3c4ucHHG39fi2tyf1puKX9Gh6HQx9PSKU1Lyx1agbCwL7b3ANvA83PgfbSznJungYqKVooBY5qTbJd8qoQi+zNgDfNgM/NtM5OrJ1bozHW446VJ6WqCiknYASQteyXFwfYnI48i2q+Hd9oTyYv0PemDojx0yyxSyhGhiCkKpDXJzm9r55GPOnTjUlJf/SdO00IdLqqujjqWpJHgd1LSOxsYruGCKT/Kcndi/k8aV1ljJNFcS0/UKOlerNNT1UIZiIhZXBwQb8GwFj+3nQa+gr9lPpccZpoqkMVkq4gFKqEIUG97WsoF/OM40iaTGpsSnrqRa6SaBPUq+llJZj4DBfGcZGPHxRtrsVJEXqKSV0E/UIVaBrbzvS4OSCwDcHz+nxrPsaPQPpFN6Y5fqHK9qxLn1MxPj5xfItxrTkotpo0FZbNNJNMaVYZoQqhgGKkDd9uT5/XOk5UrsZLQNcrr2TGkcZjY2VsEkc58nHN76m5cmVVJUL19JRTNHHNI7drACyMBG3tYYBvcaeFvoDozlQDQ1BiipCC24IiEbVHkMfb38nH6WUb0lbRb6d0hZ4RXdQ2sCQFQ4KjwAviw5vn++hy45EKV7Ls+k6iTWLHSBFWmXYzOSN7kflAzi2c6RRfse7WBYOkR0sG0RpGyoGERw7g4INxz824wNVc36J8DqZaOllgWMr3SpN4wwG4jBNznGP1vqMnJ3RSKSwdpZo2iiEGxZxlbsEc34+1/NudKk1rQ2VRN6hXxyPLEYvy23OEZtptbxgA/fNtOo2rFb2hX+HqQdK6hHUTH0FC5iXGyQ4NxY3xa9raab5JpdiRXHWF/i00tIImpQqTxK1RE0qhI3HG0KPJJJ5x76TwtuW9FJZH9j/8AD1dPUU4llKxrgrGrDegK45+xAAvjSf8AUVy+w+FtxolCslarqpkiSOF3N2Mdt5vzc2BJF+B86yWK3obdsT6ojnpt1g20qkll22ZM8k2v5Hvxrpg/2SnHMRboKWChhVJJrttIacnan68Z54/0Ok76EX7EeoxhJ3EFQSWIHbLCzezXuLgecjgeNaM2w8a9lSvqVpumSIaw/VTSRsH2enYfCm363ObjUYRXLlQ8m0qbM1VQwVkZgNMRF3UEiWFiPPzfzce2u6/ZF5gSmSaqqIulTuW7K7UdRcEX2j9eOcal5ainIpC/xYOJzQ9WeF0LU8jiMMrm9wDtvnm3INv7anfJWaqeG2pYKaojaedCUgG1o3SyD7KRj4+/31JfLRn8ez6hqkmmZ4KeGFZWIuYtoWwBubHjAPtce+nj43dMk52jmtkNJFTz749veFhIcsx4Fz++L863C20ZTwShiEs6Ok7VVR6nY2sWsxA2k+BxjyL6aPxX9itW7Gaj6eSheKVTJKDcBzZmQfN8XueDqLtSsqkmqEqdKcQlFJUyruCswX1WJBtYjaALZNx7Zvp+b6Bxp2Gk6fIkDyVDI0c+UIBZpF//AI8k8gm/GbY0XNGrKPKiuEs8ccDTOgIQtkMLHK298X5AH66ME1dmltHMn09TURyTyCNIiQoM1mL3ORYc44+dC2jcQ71cVS6w94tUGS4Z73ODnOMffz86FNaHOkTaeKnh6lIpWN3kUNdAbhixsPYXvcWxjTOTYYxo0CxCWhNPTggSTgtIp2kH2yL/ABce+oSfLoeKrsTq44xDLSJC88sDBe3Et0G4kXJ4HGik8Daf7MrDNNNUKYxhDg3O5nI/OCPN8+w10KoolrZo+iUUNLTvUPeNoF7hkYWZcYJ5z/udJJu2OkuNEHqtXP1VpKSjeVAzMEWQ2DBs3N+R5++qwqK5SEmnJ8V2fdIQUBfp8kkd0tIGFy1zk3Gs6nqBG4KmaFQlG07NFIku0jeWD5I59+LZ/wDupzdukUjH2yNWVKULSBPUzEAqiBmCG9za9re/6aaO4K805/h+pNNWzwxt3HkA/Ecnar2tYDxgD4NtPKLlGrFjNW6QSoDG7OVlCSEsQNjSHjbjJPtnF/10qcY/0HZDfT+gmqrKKaanvSxscxrcqv8ALc5xg4vyRpP5EkxnFuhnrdND1KSqWqKzCQqogjmAsqjgtxi4NweceNc6k1qwpxSTTPOgRU1PRxAPDdXczkxbRwDc3vyQLEn7DT+VybwXxqKWg/8AC46mqSoC/TUIUMjMty5PJBAJ9s+Ln21Nzq4LsrGKevoJLSUwkMP1kghqGZGRmEyE7eGIFwSB5/odNCU60V8fsmf4XTJQ/RBVaodSO1P6ji9ip8jznVP5PbJ8PXoWj6dTJSD6sskyRbFdQAZW+/A+fPGmUneG4qqYaWlqK14rxxhKZ/w4NtkuRk7xxbxf34400UvG3L2wNXSfQKsjqt3Ykwz3ULtFyObk2uRfzf29tXh5VJVESUK0Wqkq4ZQ0Bnjd4iGYFizn3UgYJ9vFtT7b5BlaS4h6OSOmlUU5YTKQAyi7s2MZ9Jvfk5/bSyt9rDKvXZcqpab66EpKzVbvuRrFmRvO4cE2GLj486Xx2tNN3g8jQ0EMtR298AAUX3N6jcgi/A55xc6o5cl9Eqpmf6jXlq6jqZZe88CnbGz35HgeLenOL2toxwzWYU+nwwx9OpI40V3AG6SR9w3H7WJBBPNrZ1OV32NHEMRKsVVUTtOX3JmKS5jX2AuMgEnz4H31GUXXEpFrtElUFKpR4qWaxN4VbaFcA2PNuSP1GrKH7Ec2PdL6PLS0rLVGUuLCXN3kzewIzb2sRoyS9mi2dSV8MAqogzpssGluAoPn1fY2vbPBOptPtDpL32Zvv/UTTzLUq9rbjHYjcc2N8AWt+uqxVtJAqrdiHRzBK080lM8iyb3hjX8NR455Hvax++qeS8URILvkWej9RhXqzTFHDzusUr33FRa9gPYWOca5pwkkrLRabZsavrZNHAtMIPpnUtcp62FvPzb5I1O6pejRjVtsnV5MHTvxlsIkGwBvzE5G4DBz4OPOmq8QVS7IXR455Ktx2po4n5lY7cjGACTYe2OdW8iyxPHL0WZaf6UVBkqJjusQ0iCQDHGefsdRUuXorXHoEO3BRPPCKeMsbhZDx6vBAvf35z4Gj/Hy7YedEXoVQIa2rqZ5ZC5Wzx9s7t262Pt7/Oqyk1GokYpN2M06Vq1L00zxrHIpLIFC9vNrA+efvfjTTVq16FjKnXaYB4JttXaf1XSOLeNu0f8AkbX2iwv5N+NJa9rQ09oPQVi2nTvEywkiWQXjZsZIJF7C3tpllP0wd4fdOpZeovUJT76enijbe7tixN+ALlhn/wBOtOSilZoRk26K1LItK8tTLO8gCkKQm2yf5tvBB/Xk65+XJ0kWUKTdnP4VaZLqZxIjb5CpWNQpG0gC3gW0sW0vqjSWljp9C0cCxCJE3qWZdvJ5GfHJJ1OcuVhiqFOotWmSKLp9X2QDZvWAx9wEB5I4JAxfR8UU9kLOT9EqknX8cQ0oRoibK0p9ec2z6sWBPFyedM1q0aDx0jzqJqHqEenhWGNHXYjXJhJ4BHgmxwT49jp4cdBK8KE/T1Afus0kqWkLq9kLEZLc4/sRoRb9G9UyhT0rR07PGsTQqNzyyLYqTfbttyTj4GtNXvRousZGrqETq7dx3aMFVSZgDIwxa4Fs/wBbDTpuGoKaaaZNo2nowFljdu6xTeu0OxsSSLnxa+PB10eTjNWiHjbWEeap+m6gEjkVlkCygiQEJk33re/Av85xo+JKUWv8Gm+MrNLQVNNTlupbgK2q5fgKL2stuPB58eNScWlx+hpaWaqrhalL9nZTWO6QqSVXkljeyi+b/bzpVotUZWq6ca2qIiqo2UcKEBkIBHquxtx4Pvqjmo+hIxb9lSubZQSRwyujhRtDRteK/G422/p5J1O25WOkkqHO7MKOJpmd6pQhXcB6jezYAwP9RoytmSQj0Gslm6qxpZIlk7HaeQW9Qa1hn+X/AMvfQusaMlY/HQqvcp4tjh7tKwbeiDP5CfmwvouRkjPdcqHij7MMcjSkBg4wqlQeR+3Gn8SyzTdYZnofSXml7Mh7ck12eRzbPn08EEZ1dNJ9k0sNBR0CrSMXlfYbxkwjJItm9jbH241KTadopFZTHP4O6ckRmG3uQyMxQMhfcDgk+TnFzqHmnbRSEaTL8jwdNlaR5VM72PaNlYIG9QVfJ/3OppvoIt1eCSuBmCqY1JYtfdYW/QcZtbF9GD4yNVxEadKlKuOYlTDzHHuINrfm4976fHGvYKd36Oo/qq+qeV2VUjNlCKwANuftnONBKKVewvk2dVMFPCZHZd9TLGNoka4/YAKPBv8AOnjJ9CuP2Sekd2p6ilXEO2wuIpWbcrIbKbW44JB+2m8jVIEO7NbU1NP06lkkemeqqVO6JN+4sfyqfsNRtydXg1cVYjIiyUrz1UCssKKjiSy73tuvmxx4+TrVT7NaZiRFOK2raCcNWzKHZ3CsQCbkkDAOBzfXXjjXpEFadl3ocTNTyIyhjTuO7eoZRa91yDfzf2NtT81KpD+Nt/ENX0zTU80igGZjb0qRutzY+R9tS8eOmUnLH9lfo9F9HZIo2Cj1NJI4kkme3ABFgB8f2zqc2m7DG6POp/UdqlSerniheUM8YcFgt/yN9ycgc6Hjq6o0uuybWiT6bZT0KQqvrJZWVnBNs4JN/g+NOu0mBVRTp6KJOjxxho1nlO4OhAx/OhzcC3OoSk+dsdVWAqWCn+qWoDvE8bMq0kZJRiQCDGD59zzn4GuhyTWLskk12xlp5acMwo5RIqi7A7lB8H7n2t/TSy1jxtIaoa1owsjd6SRR6ndwRY8jaoyP/H/nRisozSe2KhxWvNIIxZUazSZy18G+QB7X8nTPqrMl7oWgqIZj20gaV4ySu5dhjBOV3H7Wv7ak7RRf+jNdb6fT1FDPPCCK+pfe4mjA2i+QLZYAAC5vxrp8Dbxvoj5a1oVo+jU7QRIGmZIbM0jPYC/5T7kn3HHtqkvJRFRwsVFGBFPBG0bDslXZmZRtIsbXyR4++dR/HSlcsG+m1U1PBF2xIS1jGvcUslvZj4G4k2yS2i6kDjSDz9XhgpJljik74UsS8e8i17Ag4tx++txsylVgaWKo60yp2YtxWxJfMQIzkC55+bZ0jdPGF1XQ50qnh6bLLJIxhkgI21CHtglRclrZGbAqcYzrOWWv9jJejxOqU9VWVjQsAzkuWZvwzm1h+t7A3HGl9DpIz/WEnmEjCKZQpV5LX3uQb2AHFyBz7a6INdCTT79AZ6c0ku8RKJsBhuJIvkAZF7+Sc6Kl6NWDMVfBAziR5oklTt7VIADAm9zz+3jSO2nQy4rsrSg0VJFT0QB+pja8xUoc8kMPFzaw4OorW2w/0e9HpIlpaVmSRJ1YhmEglNgbkm3BJvY/popuwUksY9XTxdqdGjZQzg7UJKtfILW5bH+mlUqxBcfbwh9LpTXCtqp3l7RYgbyLXIuRj+h+ddMnwjxokvnJuy41StBQyypFM52g+lLjOCbeLX/9vrla3DoTymQep19JPK4rodgUXdSxG7xgeBjI+Ptpopr8TNxapguhUzVFbDvp705crcAkSHm3sP7C1tU8nxjrpk4K3hqesUrSlql2XsRiyrtsinm9x5PF/m2owlQzinjEukmXeVneKV5SHtJLbaRi4uLYtYi3xrfyRoyg+0MQ08NLUVM0TU83cdJkQrsug5AJt5ubeRxrLkxW6Vi1eIJ55WioZBFE6osaKd07/wAvpa3vf2HkaeEmlTYJb6J/UqiopepLT1abSzDcqyK8arbII8i4GPnTY06QEmuyx0qrPUAsyiRKhCC0khNgpwpNsXsL/wD06i1TplLtBKt6kQSduL0yZiRbEEg2DAkWGQPfxrcdVBTzThKj8WRGo4JpSLNTlCFYW4A/LYEZPv8AvppaJxrUZWfq5q3paWMRxqCVmhgBsc+ok/NrWucYzpuCXyFt9GkeoSnkhe4Tc12s7IAnqGPcXsc51NrkVi6OKWoEqTSuxIlNgY2IDWN8DFzxm3nSq0Ng59XEyhZoG29y6wswUgG9jbnNr3/fTrMEa90KTVMNSsvfES7WKbEGFI+LZJx8C2jJusGik3QjW1DbXiU/htcbFAZt2eW5/wDvnSxqhm6JlM8yRAz7EqJW5W6huQoJ8j+UeBca6U4vEc+3bGFoZOmdQHdp2iCsSF7g9JA5xbFs7v0trNqURarRiunSrMUqxF1b/wDSshOy4sb38nP76ZQzTN0OUVTEsL0yrFsZA6oFMarlj6tvJuMAkH4I0jT9BtDUXTVnFKpWnKugViZOTuPxfk3tgD20qunoKoPVVSU9XJDK0TSHDxoxXeuTu3XwQLAfPk6VVrHcW8IXUZo2laSFfW8TU8aNIXvuYAuSbl7Wx821rtU0MotexnplGvT4VKR/UyKb+iK5YgWvu5ycewtbR5cnhuNIjdWZaeoWljZmlmtJIZZSM3yLDKm2LA+L6fxtt4Cfxjoo8MX16SM0jAOAqx3WMtkXUkXP3tfGNUSwRtds08XRoOo06TVlO8cL2QyXI23twOM2GPnXMnT+JW7WkiuqX6f1UxU0CotP6OL7Wvck/pbHz51dfKPJkn8XxRQp+rxMjx1MU0TubEiGxVRf5z/TOtJJpPs0ZaCrOryGGJGimp2CjaVBLNb+Xg7h5t7+dSXhaboo5po9o4RSGURKiSXKNJEoKsQMhXawvj4Htk6t+UU27JpVJqJ6vUnmoaqaKmSSCSUBAMu4Bsb5uBfOTzqUocWkx4tU2gUFEktBNHUBA0ShptxsqqP5fljzYm39NKnUrRRqo0xqgo97iXakNIwugQna+PYeANHyStaJCNMSqOqvXPNLS1CJDu2LGD3JLZN9owPkX4xzpIRpVJGm32mG+hqoy0lRSzz0hiCuZG2hiwGbeDf+U4H31oygguEqKkEaU9MYmpWknsGMAN0LAgbw5Hq2g4wPOjNtu7wSK/R7HSVVXI8as0bCPeWaQjzk+TzbP2voRjfY7klhBqU+o6nHGCyBy5kEqKT6bBWJJsfVf9bWB0zdIWtKnSYZ6NFjWSSOlcqVaQ72G7AJt/Jceb2v7aSck3aGjFpYJdc/ixeol+n/AE8tS4ICtBFuU7R63GQSBdR92HOjDxu1LoXkkmgL1EtXSxUwoq6dY1JBSRo4wpHAQjkeT99MovtsF30h3otN2enWroEs7/hgIx7YGfSL8ZN8AedLOLbtBjKNULfxTNO6GWOnJoBYyEZkjlAwwv7C3ubE6aEaz2a7X6F1nTo1RSPUTk0tVBvireQrAXMZN/YA3wTm/GlXytJavQ7Sjp1P1OWvMexmJlIYsxObYsSfHn9uNPxStsyeYFrKqcRw1EECx0zkt3HDMGO43KkjJJBGPOljDKYXNPo6o6ernlkqqqCKnV89osGdPlgP3tc2A/cLjFcewfJ70PUvTd0MxEb/AIpBuME5sLGxtfH6adOhKUuxCoo16jTmf6nuTpKCtmKhEBswZTyMi1vURn40/wDK4+hXD96V46YK0cTwv3prFUlwJcAgBeLAc7s83Ot/ImDgxuCkkgjMu2VhM35Gsojtez4y7WFvsNLKV4maKq7Q7M70gWSAQuQCwYMVW+eTa+OT8aVywMY7Zj+q/Tfjl0T1gSSSxsdoB48i2CebZOjB3pRmXSubsTIonkmVWcEH1D24Ocfpn3A10y8eWRU37K9SldPTxsajsLIFHZ33VCQMm3IxnOMamnCN2rKPlJYzymgq+q1KtNP/ANQh2BmG4h7+w5+3zotqEXxXYKc38vRUoOk/W1LhnBncqrzOxuQDyPI4sFt450i8roL8cVpdqVhpqHLq4VdqOpyHtxc8cX1N6xkklZC6d0yGv6NWVM9VL9QJCIhENg8bSTwbfH+uqfyU6E4f7B57RTwQ0nahaKP1Ord3cfhjm5Nz7jSXaYV8eiZXWlYUz1QfuSKSm4b5DeygnwN3/OqRxX9AenzwStDMyLTszYZChuov6bXv7+OL6e1gsYy0doVpaPbEiXRFvK5upQtfyDbnxqUnKTbKRio4BMkUta8nfcUqkB1YlEuBhgPJNj8Wz7aVxaj1rGtO6ZUVf8Tq6NOnyFKYDcRtdRGMkgC3qb5wBcanXfIF7gampFhQxqYlaIsWYAhgCST6r558e1tI2xqSfQZzUSwxO07VEcl2xIqEkXzm2QPvoKK/yNyffoWqnWlRJ6aGV3U33lt23dwAPuABpo28Yso1oQ0jdLggWSnklknb8QwpmIt/Kf5gAL50btUmKlWslTo8s9VEqhR3QoViFsFFubHNrgG3HzqkUlFWK23dFhYTQ0f1TNFFUbSqRttZpDYkLa+AASfe+pT3GPHLMx0Togkq6mfpzCJTtZpJV3sXHtaxsPmw+Dq7l8fmTjHbiavpa00kL92b8d0KyLvup9yR4Pvi+pybrBlGnYvP9OZ49k7bzGxYbWUMvsBxzn3P2xoK60a7YF41qaVe6wepiYsoKG9xgE3PwL/20Wm2CL4nvUP4Mpq3pslPHOsBqrTNDuLbHVr3C2w27HtYnm+hGbjL+jNWn+yLD0+SkSqSYLTVUbnLoXjIINgrcH7e+PnTS8ntf/QQV3Zounqv08Aiab6lbA7AAUsMEFvzCx8Y0E03+hWmihL0uSloBUUzLUtCNzNdfUTkWti4PN+BxrN8lRk6I81NNN0ucShYHDhQ0cl0YlfXc+B4BzxxrKk+xv8AAnQypVSR1cMH0xlF2WRwu8hRgrcEeD6ffVGqVdirQ0lXTipiDKs7yFhI/wDMGvc2HAGbe2hJfWUGNXuhD1aGssKVnWSJQZI4vS5OA1/g/wBdKk/9Rs9DKqJIFlmnMam8hgv6lN/T7DnOjdYGiM0QroZaWDuOsb/iqUAB5vfzb/XTR+LtmdV2RFamopZhBTgwyEhSoGSDlWXkX4uBj51aSbjdk40nVFakc18PaeSmQ4KK0tzGlwbFhyc8fGovOmVHenoJevNKse7aqgGddgPgEHycnj4tpHKu3QyXdF+JKeh3F+2ZWPcYphr3wCSb7r+Bo72J3hNmqoKiaehkO12GSAAqk3B+N3x86Xi+xotCP0LJCYdojp0cAyZXctiCff249+dBNqVsLpxdB4mgjcUscwEUTbzZgFAOFXHuRb7fvqmXbESdcSTUPGlQzqnrg2gLfJycfoSeBf8AbVIU1TfYJKv8BGq5RTTd6lMTixZpbFmPAwMX/XGpyW9jRaaeA6aomkQJDRXgI/FeUN6WvkhRfdfPnzp01HsRrk7R4sE1VVSSUsUEKE72L2Jc/wA20+Ba37gW1PkopKWlOLbwtwda6hLNCkNIyzhPRYgi3li17gEW/rjQcU1bYt1henoWlp4kmaN+6FacAm7bcmxOGH9r651kiitokyS0UDxUU8plhmJsDIZCL+cnBN+QRqqcnpsiqCPDRwvGkQZ5pJUHclW5sOB7ew/UaWUnyMlcbZykJp5Wnli7MxkWKOQMSEck3OOPnkDTddAr2dzIaWNgaaGqKIsAdGuF87gTwAPvkaVSVVYGnd0Z/q1dLFNHDExsMvIwu0jXJOfYgWtjXR4oWrYnklQKjmaiRgZmkYxsA8cgQh9xI9JHAvn4I1aUVJUJF1o70+sjr2Mvbijkhu5za7XwAP8AUZ1zz8fFUVU0w6mNLhAZlUkheGS/BI8AZH7aRG/oTkqVkminSdZoUIFmOC3nJvwNPHFQjVuyn0ismo6lpFRJhPteSn9W4ZNvHq8HwBoKovAyi5KznqvV5epUDN+HFGCF2Kby3v8AlvcjA4HuefYKK5GbygfSo0gjeSoanpFjicRFHIWS6XDMDfHJsD7/AG0Jy2lplHLZQperOkStF/25yI5NzHdawIfjOcW/20c6Dr6OZABFW00MiRzblJZ49wAK3CjJuffxe3jjLqwNMlyCloUjatljhaMfltvcxsxutvHjPOnSt/EDdfkTkAphV9mmmplUoUbEg2AW3Kb5JwPgD50VK6TBVXRW6RT7KRqyNU3l9zIRmwGAPtfH66SVp0x4/YWpnpYmPck2yOFFgpvzzgfe3/GlSbHtR7EKUK00lPIhaK4kVY5DkgWtuvgGxPsSdM+TWCpRCdWo5HpDHHTQwzSRlVZrEADdkWtY+fk6bxOk7BPXgXpkMVMag1IBpSBEzRq3AyWaw9yT7ftrOhYydWU6epkFHFUbAkcuGDMqFQD6cG5xzfFybak/Gl8ux4zb+Lwm1kg2yz08LvI7gozKAT7Y5JNjxxfVofP8hJfHELiKaV3rJadSY1sI0JN18E28bjgHJ1SopUhU5PKJ9XX1k/VI46dnqO9tjRL2C2GbkcYBOdaPjTjdGc/lSFwn1srQRzOJQArqyDaCfCjjAGbknWUHFWw8k3SY9LJ9DSlI/wAclctI1yzE2UC3Jv49vvpW30h6pN9n/9k=',
	'images/materials/rock2.jpg':			'data:image/jpeg;base64,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',
	'images/materials/scratch.jpg':			'data:image/jpeg;base64,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',
	'images/materials/scratch_round.jpg':	'data:image/jpeg;base64,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',
	'images/materials/tile.jpg':			'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/wAALCAEAAQABAREA/8QAGQABAQEBAQEAAAAAAAAAAAAAAAMGAgUE/8QAIBABAAEDBQEBAQAAAAAAAAAAAAIBBTIDExVRUiESIv/aAAgBAQAAPwD47ZbqakafHtwstK0xd8JTycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJHycJTy4nZaUpX+XiXO3U041+PbscKVjFqNLSj+afFNqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6NqnRtU6T1dKP5r8Ze+QpSMndixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZFixi1OliqAAAAAAAAAlq4stfcZOLHOlIxajS1Y/mn1Tdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btOzdp2btO09XVj+a/WXvk6VjJ4lsuNNONPr24XqlKZO+bp6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obj6Obp6cTvVK0r/TxLncaaka/X//Z',
	'images/materials/water.jpg':			'data:image/jpeg;base64,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',
	'images/materials/wood.jpg':			'data:image/jpeg;base64,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',
	'images/materials/wood_round.jpg':		'data:image/jpeg;base64,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',
};


Mecho.loadImageForTexture = function(gl,url,texture)
{
	var image = new Image();
	image.onload = function() {
		Mecho.ongoingImageLoads.splice(Mecho.ongoingImageLoads.indexOf(image),1);
		Mecho.textureFinishedLoading(gl,url,image,texture);
	}
	Mecho.ongoingImageLoads.push(image);
	
	image.src = Mecho.localImages[url] || url;
}
﻿//===================================================
//
// Module:	Mecholet
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructor:
// 		Mecholet()
//
// Position properties:
//		center
//		centerOffset
//		imageOffset
//		rotH
//		rotV
//		rotS
//		rotT
//
// Material properties:
//		material[] - material or true/false
//		tiles[]
//
// Visual properties:
//		visible
//		interactive
//		nice
//		followed
//		optimize
//
// Misc:
//		custom(properties)
//
//===================================================

Mecho.Mecholet = function()
{
	Mecho.id += 3;
	this.id = Mecho.id;
	this.idColor = [
		(this.id & 0xff)/255,
		((this.id>>8) & 0xff)/255,
		((this.id>>16) & 0xff)/255 ];
	this.ctx = Mecho.lastContext;

	this.mCenter = [0,0,0];
	this.mH = 0;
	this.mV = 0;
	this.mS = 0;
	this.mT = 0;
	this.mCenterOffset = undefined;
	this.imageOffset = undefined;
	this.dirty = false; 		// rotation or center changed
	this.optimize = this.ctx.optimize||false;

	this.images = [];
	this.mTiles = [1,1,1,1];	// texture scale
	this.material = Mecho.DEFAULT_MATERIAL;
	//this.color = [1,1,1];
	//this.colorEx = [1,1,1];
	//this.mImage = null;
	//this.mImageEx = null;

	this.visible = true;
	this.interactive = false;
	this.nice = false;
	this.mFollowed = false;

	this.oxyz = new Mecho.Matrix();
	this.ctx.mecholetList.push(this);
	
	//collect custom options
	this.customValues = undefined;
	this.customIndex = undefined;
	for (var i=arguments.length-1; i>=0; i--)
	{
		if (arguments[i]==undefined)
			continue;
			
		if (arguments[i].constructor==Object)
		{
			this.customIndex = i;
			this.customValues = arguments[i];
		}
		else
			break;
	}
}


Object.defineProperty(Mecho.Mecholet.prototype,'rotH',
{
	get: function()  {return this.mRotH;},
	set: function(a) {this.mRotH=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'rotV',
{
	get: function()  {return this.mRotV;},
	set: function(a) {this.mRotV=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'rotS',
{
	get: function()  {return this.mRotS;},
	set: function(a) {this.mRotS=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'rotT',
{
	get: function()  {return this.mRotT;},
	set: function(a) {this.mRotT=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'center',
{
	get: function()  {return this.mCenter;},
	set: function(a) {this.mCenter=a; this.dirty=true; if (this.onCenter) this.onCenter();}
});


Object.defineProperty(Mecho.Mecholet.prototype,'centerOffset',
{
	get: function()  {return this.mCenterOffset;},
	set: function(a) {this.mCenterOffset=a; this.dirty=true;}
});


Object.defineProperty(Mecho.Mecholet.prototype,'followed',
{
	get: function()  {return this.mFollowed;},
	set: function(a)
		{
			if (a)
				this.ctx.viewObject.follow = this; // set new follow
			else
				this.ctx.viewObject.follow = undefined; // clear current follow
			this.mFollowed = a;
		}
});

Object.defineProperty(Mecho.Mecholet.prototype,'material',
{
	get: function()  {return this.mMaterial;},
	set: function(a)
		{
			if (a===true)
			{
				this.visible = true;
				return;
			}
			
			if (a===false)
			{
				this.visible = false;
				return;
			}
			
			// convert single values into arrays: v->[v]
			if (a.constructor != Array)
				a = [a];
				
			// convert color to array: [r,g,b]->[[r,g,b]]
			if (isFinite(a[0]))
				a = [a];
				
			this.mMaterial = [];
			for (var i=0; i<a.length; i++)
			{
				if (isFinite(a[i][0]))
				{
					// set materials
					this.mMaterial[i] = {
						color: a[i],
						image: null,
						reflection: 0.2,
						shininess: 3,
						tiles: null,
						groundReflection: 0.5,
						groundScale: 10,
					}
				}
				else
				{
					// if an image is not loaded, load it now
					if (a[i].name && !this.images[a[i].name])
						this.images[a[i].name] = new Mecho.Image('images/materials/'+a[i].name);

					// set materials
					this.mMaterial[i] = {
						color: a[i].color || [1,1,1],
						image: a[i].name?(this.images[a[i].name] || null):null,
						reflection: (a[i].reflection!=undefined)?a[i].reflection:0.2,
						shininess: (a[i].shininess!=undefined)?a[i].shininess:3,
						tiles: a[i].tiles || null,
						groundReflection: (a[i].groundReflection!=undefined)?a[i].groundReflection:0.5,
						groundScale: a[i].groundScale || 10,
					}
				}
			}
			if (this.onMaterial) this.onMaterial();
		}
});


Object.defineProperty(Mecho.Mecholet.prototype,'tiles',
{
	get: function()  {return this.mTiles;},
	set: function(a) {
			this.mTiles[0] = a[0]||1;
			this.mTiles[1] = a[1]||1;
			this.mTiles[2] = a[2]||1;

			this.mTiles[3] = a[3]||1;
			this.mTiles[4] = a[4]||1;
			this.mTiles[5] = a[5]||1;
			this.mTiles[6] = a[6]||1;

			this.mTiles[7] = a[7]||1;
			this.mTiles[8] = a[8]||1;
			this.mTiles[9] = a[9]||1;
			this.mTiles[10]= a[10]||1;
		}
});

Mecho.Mecholet.prototype.point = function(v)
{
	this.fixIfDirty();
	return this.oxyz.point(v);
}

Object.defineProperty(Mecho.Mecholet.prototype,'otherPoint',
{
	get: function()  {return this.atPoint(1);},
});

Object.defineProperty(Mecho.Mecholet.prototype,'midPoint',
{
	get: function()  {return this.atPoint(0.5);},
});

Mecho.Mecholet.prototype.fixIfDirty = function()
{
	if (this.dirty || !this.optimize)
	{
		if (this.parent)
		{
			this.parent.fixIfDirty();
			this.oxyz.matrix = this.ctx.cloneMatrix(this.parent.oxyz.matrix);
//			this.oxyz.matrix[12]=0;
//			this.oxyz.matrix[13]=0;
//			this.oxyz.matrix[14]=0;
//			this.oxyz.matrix[15]=1;
		}
		else
			this.oxyz.identity();
		
		this.oxyz.translate(this.center);

		if (this.rotH) this.oxyz.rotateXY(this.rotH);	//Z
		if (this.rotV) this.oxyz.rotateXZ(-this.rotV);	//Y

		if (this.rotT) this.oxyz.rotateYZ(this.rotT);	//X
		if (this.rotS) this.oxyz.rotateXY(this.rotS);	//Z

		//if (this.scale) this.oxyz.scale(this.scale);
		if (this.centerOffset) this.oxyz.untranslate(this.centerOffset);

		this.dirty = false;
	}
}


Mecho.Mecholet.prototype.done = function()
{
	this.oxyz.identity();
	
	this.oxyz.translate(this.center);

	if (this.rotH) this.oxyz.rotateXY(this.rotH);
	if (this.rotV) this.oxyz.rotateXZ(-this.rotV);

	if (this.rotT) this.oxyz.rotateYZ(this.rotT);
	if (this.rotS) this.oxyz.rotateXY(this.rotS);

	//if (this.scale) this.oxyz.scale(this.scale);
	if (this.centerOffset) this.oxyz.untranslate(this.centerOffset);

	this.dirty = false;
}


Mecho.Mecholet.prototype.prepareMaterial = function(m,m2)
{	// m - index of material
	var gl = this.ctx.gl;
	
	if (Mecho.normalRender)
	{	// normal render of shaded colors and textures
		if (!m)
		{
			gl.uniform1i(this.ctx.uLight,true);

			gl.enableVertexAttribArray(this.ctx.aXYZ);
			gl.enableVertexAttribArray(this.ctx.aNormal);
		}
		
		var material = this.material[m]||this.material[m2];
		if (material)
		{
			gl.uniform1f(this.ctx.uReflection,material.reflection);
			gl.uniform1f(this.ctx.uShininess,material.shininess);
			this.ctx.gl.uniform3fv(this.ctx.uColor,material.color);
		}
		
		if (material && material.image && gl.isTexture(material.image.texture))
		{
			gl.enableVertexAttribArray(this.ctx.aTexCoord);
			gl.uniform1i(this.ctx.uTexture,true);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D,material.image.texture);
			gl.uniform1i(this.ctx.uTexture,true);
		}
		else
		{
			if (!m)
			{
				gl.disableVertexAttribArray(this.ctx.aTexCoord);
				gl.bindTexture(gl.TEXTURE_2D,null);
				gl.uniform1i(this.ctx.uTexture,false);
			}
		}
	}
	else
	{	// special render for picking objects, uses only color id
		gl.uniform1i(this.ctx.uLight,false);
		gl.uniform1f(this.ctx.uReflection,0);
		gl.uniform1f(this.ctx.uShininess,0);
		gl.enableVertexAttribArray(this.ctx.aXYZ);
		gl.disableVertexAttribArray(this.ctx.aNormal);
		gl.disableVertexAttribArray(this.ctx.aTexCoord);
		this.ctx.gl.uniform3fv(this.ctx.uColor,this.idColor);
		gl.bindTexture(gl.TEXTURE_2D,null);
		gl.uniform1i(this.ctx.uTexture,false);
	}
}


Mecho.Mecholet.prototype.draw = function()
{
	this.fixIfDirty();

	if (!this.visible) return;
	if (!Mecho.normalRender && !this.interactive) return;

	this.ctx.pushMatrix();
	{
		var gl = this.ctx.gl;

//		if (this.centerOffset) this.oxyz.untranslate(this.centerOffset);
		if (this.imageOffset) this.oxyz.translate(this.imageOffset);

		var mat = this.ctx.matrixMultiply(this.ctx.modelMatrix,this.oxyz.matrix);
		gl.uniformMatrix4fv(this.ctx.uModelMatrix,false,mat);
		this.drawFaces(); // defined in successors
	}
	this.ctx.popMatrix();
}


Mecho.Mecholet.prototype.custom = function(properties)
{
	for(var n in properties) this[n]=properties[n];
	return this;
}


// Tracelet

Mecho.Tracelet = function(pencil)
{
	if (Mecho.Tracelet.vertices>Mecho.Tracelet.MAX_VERTICES)
	{
		throw new Error('Too many traces. Increase Mecho.Tracelet.MAX_VERTICES='+Mecho.Tracelet.MAX_VERTICES+'.');
	}
	
	this.ctx = Mecho.lastContext;
	var gl = this.ctx.gl;

	this.pencil = pencil;
	this.visible = true;
	
	if (pencil.trace)
	{	// the pencil has a trace, create the current instance
		// as a static-buffer copy of that trace
		this.size = pencil.trace.count;		// number of allocated vertices
		this.count = this.size;				// number of used vertices
		this.dynamic = false;

//console.log('Creating a cloned trace size =',this.size);
		// clone tha pencil buffer into a static buffer
		
		var mesh = pencil.trace.mesh.slice(0,3*this.size); // 1 vertex = 3 numbers
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
		
		pencil.trace.count = 0;
	}
	else
	{	// the pencil has no trace, create the main dynamic-buffer trace
		this.size = Mecho.Tracelet.VERTICES; // number of allocated vertices
		this.count = 0;		// number of used vertices
		this.dynamic = true;
//console.log('Creating a new trace size =',this.size);
		// create a new empty dynamic buffer
		this.mesh = new Float32Array(3*this.size); // 1 vertex = 3 numbers
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER,this.mesh,gl.DYNAMIC_DRAW);
	}

	Mecho.lastContext.traceletList.push(this);
	Mecho.Tracelet.vertices += this.size;
}

Mecho.Tracelet.prototype.draw = function()
{
	if (!this.visible) return;

	var gl = this.ctx.gl;

	gl.uniform3fv(this.ctx.uColor,this.pencil.material[0].color);
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,3*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.drawArrays(gl.LINE_STRIP,0,this.count);
}

Mecho.Tracelet.prototype.isFull = function()
{
	return this.count>=this.size;
}

Mecho.Tracelet.prototype.breakTrace = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	this.mesh[this.count*3] = undefined;
	this.mesh[this.count*3+1] = undefined;
	this.mesh[this.count*3+2] = undefined;
	gl.bufferSubData(gl.ARRAY_BUFFER,this.count*3/*coords*/*4/*size-of-float*/,Mecho.Tracelet.BREAK);
	this.count++;
	
	if (this.isFull())
	{
		new Mecho.Tracelet(this.pencil);
	}	
}

Mecho.Tracelet.prototype.add = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	this.mesh[this.count*3] = this.pencil.center[0];
	this.mesh[this.count*3+1] = this.pencil.center[1];
	this.mesh[this.count*3+2] = this.pencil.center[2];
	gl.bufferSubData(gl.ARRAY_BUFFER,this.count*3/*coords*/*4/*size-of-float*/,new Float32Array(this.pencil.center));
	this.count++;
	
	// there is trace is full, copy current trace into a new
	// storage static trace and push again the center (the
	// cloning should reset the this.trace.count to 0)
	if (this.isFull())
	{
		new Mecho.Tracelet(this.pencil);
		this.add();
	}
}

Mecho.Tracelet.MAX_VERTICES = 1000000; // aprox 12 MB
Mecho.Tracelet.VERTICES = 5000; // aprox 60 kB
Mecho.Tracelet.vertices = 0;
Mecho.Tracelet.BREAK = new Float32Array([undefined,undefined,undefined]);
﻿//===================================================
//
// Module:  Ball
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		ball(center)
//		ball(center,width)
//
// Properties:
//		width
//		tiles - [x,y]
//
//===================================================

Mecho.Ball = function(center,width,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;

	this.nice = true;
	this.center = center;
	this.width = width||1;

	var n = Mecho.N(PI*this.width/2);
	this.tiles = [2*n,n];
	
	this.custom(this.customValues);
}


Mecho.Ball.prototype = Object.create(Mecho.Mecholet.prototype);


Mecho.Ball.prototype.drawFaces = function()
{
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.width/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometrySphere[this.nice].drawFaces();
}


Mecho.Ball.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.width/2]);
}


function ball(center,width,custom)
{
	return new Mecho.Ball(center,width,custom);
}
﻿//===================================================
//
// Module:  Beam
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		beam(center)
//		beam(center,length)
//		beam(center,length,width)
//		beam(center,length,width,height)
//		beam(center,length,width,height,baseWidth)
//		beam(center,length,width,height,baseWidth,baseHeight)
//		beam(center,length,width,height,baseWidth,baseHeight,otherHeight)
//
// Properties:
//		length
//		width
//		height
//		baseWidth
//		baseHeight
//		otherHeight
//
//===================================================

Mecho.Beam = function(center,length,width,height,baseWidth,baseHeight,otherHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.length = length||10;
	this.width = width||1;
	this.height = height||0.25;

	this.baseWidth = baseWidth||(1.5*this.width);
	this.baseHeight = baseHeight||(2*this.height);
	this.otherHeight = otherHeight||(this.baseHeight+this.height);
	this.nice = true;
	
	this.tiles = [
/*0*/	Mecho.N(this.length),	// rod.x
/*1*/	Mecho.N(this.width),	// rod.y
/*2*/	Mecho.N(this.height),	// rod.z

/*3*/	Mecho.N(2*PI*this.width/2),	// cyl.B.x
/*4*/	Mecho.N(this.otherHeight),	// cyl.B.y
/*5*/	Mecho.N(2*this.width/2),	// cap.B.x
/*6*/	Mecho.N(2*this.width/2),	// cap.B.y

/*7*/	Mecho.N(2*PI*this.width/2),	// cyl.A.x
/*8*/	Mecho.N(this.baseHeight)/2,	// cyl.A.y
/*9*/	Mecho.N(2*this.width/2),	// cap.A.x
/*10*/	Mecho.N(2*this.width/2),	// cap.A.y
	]
	
	this.custom(this.customValues);
}


Mecho.Beam.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Beam.prototype.drawFaces = function()
{
	// draw the main beam
	this.prepareMaterial(0);

	this.ctx.gl.uniform3f(this.ctx.uScale,this.length,this.width,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,this.length/2,0,0);
	this.ctx.geometryCube.drawFaces(this,0,this.tiles[0],this.tiles[1],this.tiles[2]);
	
	if (this.otherHeight >= this.height && this.otherHeight >= this.baseHeight)
	{
		// draw extruders B
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[3],this.tiles[4]);
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.otherHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();
		
		// draw caps B
		this.prepareMaterial(1,0);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[5],this.tiles[6]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.width/2,this.width/2,this.otherHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.width/2,this.width/2,this.otherHeight);
	}
	
	if (this.baseHeight>this.height && this.baseWidth>this.width)
	{
		// draw extruders A
		this.prepareMaterial(2,0);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[7],this.tiles[8]);
		this.ctx.gl.uniform3f(this.ctx.uScale,this.baseWidth/2,this.baseWidth/2,this.baseHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCylinder[this.nice].drawFaces();

		// draw caps A
		this.prepareMaterial(3,1);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[9],this.tiles[10]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.baseWidth/2,this.baseWidth/2,this.baseHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,this.length,0,0);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.baseWidth/2,this.baseWidth/2,this.baseHeight);
	}
	
	this.ctx.gl.uniform3fv(this.ctx.uPos,[0,0,0]);
}

Mecho.Beam.prototype.onMaterial = function()
{
	// material has changed - set tiles for the disks
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[5] = this.material[1].tiles[0];
		this.tiles[6] = this.material[1].tiles[1];
	}
	if (this.material[3] && this.material[3].tiles)
	{
		this.tiles[9] = this.material[3].tiles[0];
		this.tiles[10] = this.material[3].tiles[1];
	}
}

Mecho.Beam.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.length,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.length,relY*this.width/2,relZ*this.height/2]);
}


function beam(center,length,width,height,baseWidth,baseHeight,otherHeight,custom)
{
	return new Mecho.Beam(center,length,width,height,baseWidth,baseHeight,otherHeight,custom);
}
﻿//===================================================
//
// Module:  Box
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		box(center)
//		box(center,length)
//		box(center,length,width)
//		box(center,length,width,height)
//
// Properties:
//		length
//		width
//		height
//		tiles - [x,y,z]
//
//===================================================

Mecho.Box = function(center,length,width,height,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.length = length||1;
	this.width = width||this.length;
	this.height = height||this.width;

	this.centerOffset = [0,0,-this.height/2];
	this.tiles = [Mecho.N(this.length),Mecho.N(this.width),Mecho.N(this.height)];
	
	this.custom(this.customValues);
}

Mecho.Box.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Box.prototype.drawFaces = function()
{
	this.ctx.gl.uniform3f(this.ctx.uScale,this.length,this.width,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);

	this.prepareMaterial(0);
	this.ctx.geometryCube.drawFaces(this,1,this.tiles[0],this.tiles[1],this.tiles[2]);
}


Mecho.Box.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.height/2]);
	else // atPoint(x,y,z)
		return this.point([relX*this.length/2,relY*this.width/2,relZ*this.height/2]);
}


function box(center,length,width,height,custom)
{
	return new Mecho.Box(center,length,width,height,custom);
}
﻿//===================================================
//
// Module:  Disk
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		disk(center)
//		disk(center,width)
//		disk(center,width,height)
//
// Properties:
//		width
//		height
//		hollow
//		tiles - [x-side,y-side,x-base,y-base]
//
//===================================================

Mecho.Disk = function(center,width,height,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.width = width||2;
	this.height = height||1;

	this.hollow = false;
	this.nice = true;

	this.tiles = [
		Mecho.N(2*PI*this.width/2),	// horizontal side
		Mecho.N(this.height),		// vertical side
		Mecho.N(this.width/2),		// x axis base
		Mecho.N(this.width/2),		// y axis base
	];
	
	this.custom(this.customValues);
}


Mecho.Disk.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Disk.prototype.drawFaces = function()
{
	// draw cylindrical surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw bases
	if (!this.hollow)
	{
		this.prepareMaterial(1);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
		this.ctx.geometryCirclePlates[this.nice].drawFaces(this.width/2,this.width/2,this.height);
	}
}

Mecho.Disk.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

Mecho.Disk.prototype.onMaterial = function()
{
	// material has changed - set tiles for the bases if the
	// material for the bases has tiles
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[2] = this.material[1].tiles[0];
		this.tiles[3] = this.material[1].tiles[1];
	}
}

function disk(center,width,height,custom)
{
	return new Mecho.Disk(center,width,height,custom);
}
﻿//===================================================
//
// Module:  Gear
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		gear(center,width,height,baseWidth,baseHeight)
//
// Properties:
//		width
//		height
//		baseWidth
//		baseHeight
//		tiles - [cir, out-h, in-h, slope]
//		gears
//
//===================================================

Mecho.Gear = function(center,width,height,baseWidth,baseHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.width = width||5;
	this.mHeight = height||1;
	this.mBaseWidth = baseWidth||(this.width>=4?1:this.width/4);
	this.mBaseHeight = baseHeight||2*this.mHeight;
	this.gears = 1;
	
	this.nice = Mecho.VERYTRUE;

	this.tiles = [
		Mecho.N(2*PI*(this.width/2-this.baseWidth)),	// peripheral outer & inner
		Mecho.N(this.height),			// vertical outside
		Mecho.N(this.baseHeight),		// vertical inside
		Mecho.N(this.baseWidth),		// slope peripheral
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Gear.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Gear.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw external surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform1i(this.ctx.uSharpCone,true);
	this.ctx.gl.uniform1f(this.ctx.uGears,this.gears*20*this.width);
	this.ctx.gl.uniform1f(this.ctx.uTeeth,1);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();
	this.ctx.gl.uniform1f(this.ctx.uTeeth,0);

	// draw internal surface
	this.ctx.gl.uniform3f(this.ctx.uScale,-this.width/2+this.baseWidth,-this.width/2+this.baseWidth,this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[2]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw sloped surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2-this.baseWidth,
		this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2-this.baseWidth,
		this.dx,-this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,-(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,-this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform1i(this.ctx.uSharpCone,false);
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);
}

Object.defineProperty(Mecho.Gear.prototype,'height',
{
	get: function()  {return this.mHeight;},
	set: function(a) {this.mHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Gear.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Gear.prototype,'baseWidth',
{
	get: function()  {return this.mBaseWidth;},
	set: function(a) {this.mBaseWidth=a; this.needAdjust=true;}
});

Mecho.Gear.prototype.adjustNormals = function()
{
	this.dx = (this.baseHeight-this.height)/2;
	this.dy = this.baseWidth;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;
	this.needAdjust = false;
}

Mecho.Gear.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

function gear(center,width,height,baseWidth,baseHeight,custom)
{
	return new Mecho.Gear(center,width,height,baseWidth,baseHeight,custom);
}
﻿//===================================================
//
// Module:  Pencil
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		pencil(center)
//		pencil(center,height)
//		pencil(center,height,width)
//		pencil(center,height,width,baseHeight)
//		pencil(center,height,width,baseHeight,otherHeight)
//
// Properties:
//		height
//		width
//		baseHeight
//		otherHeight
//		up
//		down = true, false or number
//		downNext - true=drawing lines start at the first change AFTER down
//		hollow - no top
//
//===================================================

Mecho.Pencil = function(center,height,width,baseHeight,otherHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.mPencilUp = true; // must be before center

	this.center = center;
	this.height = height||10;
	this.mWidth = width||0.6;
	this.mBaseHeight = baseHeight||1.5*this.mWidth;
	this.otherHeight = otherHeight||1;
	this.material = [Mecho.BLACK];
	this.trace = undefined;
	this.downNext = true;
	this.downTimer = false;
	this.upTime = 0;

	this.needAdjust = true;
	this.nice = Mecho.PENCIL;
	this.hollow = false;
	this.lengthBody = this.height-this.baseHeight-(this.hollow?0:this.otherHeight);
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Pencil.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Pencil.prototype.drawFaces = function()
{
	// draw body
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.lengthBody);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.lengthBody/2+this.baseHeight);
	this.ctx.gl.uniform3fv(this.ctx.uColor,[1,0.7,0]); // orange body
	this.ctx.geometryCylinder[this.nice].drawFaces();
	// draw top
	if (!this.hollow)
	{
		// white collar
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,0.2);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height-this.otherHeight+0.1);
		this.ctx.gl.uniform3fv(this.ctx.uColor,[1,1,1]); // white collar
		this.ctx.geometryCylinder[this.nice].drawFaces();

		// top side
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.otherHeight-0.2);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height-this.otherHeight/2+0.1);
		this.ctx.gl.uniform3fv(this.ctx.uColor,this.material[0].color); // graphite color
		this.ctx.geometryCylinder[this.nice].drawFaces();
		
		// top cap
		this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,0.1);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height);
		this.ctx.geometrySphere[this.nice].drawFaces();
	}
	
	// wood cone
	this.ctx.gl.uniform3fv(this.ctx.uColor,[1,0.8,0.6]); // orange body
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/6,this.width/2,
		this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,2*this.baseHeight/3);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.baseHeight/3);
	this.ctx.geometryCone[this.nice].drawFaces();
	
	// graphite cone
	this.ctx.gl.uniform3fv(this.ctx.uColor,this.material[0].color); // graphite color
	//this.ctx.gl.uniform1i(this.ctx.uLight,false);
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/32,this.width/6,
		2,-1);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,this.baseHeight/3);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.geometryCone[this.nice].drawFaces();
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);

	// graphite tip
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/32,this.width/32,this.width/128);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.geometrySphere[this.nice].drawFaces();

}

Object.defineProperty(Mecho.Pencil.prototype,'width',
{
	get: function()  {return this.mWidth;},
	set: function(a) {this.mWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pencil.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pencil.prototype,'up',
{
	get: function()  {return this.mPencilUp;},
	set: function(a) 
		{	// no need, state is not changed
			if (a == this.mPencilUp)
				return;
				
			if (a)
			{	//down->up
				this.trace.breakTrace(); 
				this.downTimer = false;
			}
			else
			{	//up->down
				if (!this.trace)
					this.trace = new Mecho.Tracelet(this);
				if (!this.downNext)
					this.trace.add(); 
			}
			this.mPencilUp=a;
		}
});

Object.defineProperty(Mecho.Pencil.prototype,'down',
{
	get: function()  {return !this.up;},
	set: function(a) 
		{
			// if parameter A is a number, then it also
			// sets the downtimer
			if (a!=true && a!=false)
			{
				this.upTime = Mecho.time+a;
				this.downTimer = true;
				a = true;
			}
			this.up = !a;
		}
});


Mecho.Pencil.prototype.adjustNormals = function()
{
	this.dy = this.width/2;
	this.dx = 2*this.baseHeight/2;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;

	this.needAdjust = false;
}


Mecho.Pencil.prototype.onMaterial = function()
{
	if (!this.material[0]) this.material[0]={};
	this.material[0].image = undefined;
	this.material[0].reflection = 0.1;
	this.material[0].shininess = 1;
}

Mecho.Pencil.prototype.onCenter = function()
{
	// if pen is up - do not draw
	if (this.up) return;

	// check for automatic up
	if (this.downTimer && Mecho.time>this.upTime)
	{
		this.downTimer = false;
		this.up = true;
	}

	// if no trace instance exists, create a dynamic one now
	if (!this.trace)
		this.trace = new Mecho.Tracelet(this);

	// add the trace
	this.trace.add();
}

Mecho.Pencil.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.height]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height]);
}

function pencil(center,height,width,baseHeight,otherHeight,custom)
{
	return new Mecho.Pencil(center,height,width,baseHeight,otherHeight,custom);
}
﻿//===================================================
//
// Module:  Pillar
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		pillar(center)
//		pillar(center,height)
//		pillar(center,height,width)
//		pillar(center,height,width,baseHeight)
//		pillar(center,height,width,baseHeight,baseWidth)
//
// Properties:
//		height
//		width
//		baseHeight
//		baseWidth
//		tiles - [x-rod,y-rod,x-top,y-top]
//		hollow - affects bottom base
//
//===================================================

Mecho.Pillar = function(center,height,width,baseHeight,baseWidth,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.height = height||10;
	this.mWidth = width||1;
	this.mbaseHeight = baseHeight||(this.height>=2?1:this.height/2);
	this.mbaseWidth = baseWidth||(this.mWidth+2*this.mbaseHeight);

	this.needAdjust = true;
	this.nice = true;
	this.hollow = true;

	this.tiles = [
		Mecho.N(PI*this.width),	// horizontal side
		Mecho.N(this.height-this.baseHeight),		// vertical side
		Mecho.N(PI*this.width),		// x axis base
		Mecho.N(this.baseHeight),		// y axis base
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Pillar.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Pillar.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw rod surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height-this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,(this.height+this.baseHeight)/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw base surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.baseWidth/2,this.width/2,
		this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);

	// draw bases
	this.prepareMaterial(1,0);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[4],this.tiles[5]);
	this.ctx.geometryCirclePlates[this.nice].drawFaces(this.hollow?0:this.baseWidth/2,this.width/2,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
}

Object.defineProperty(Mecho.Pillar.prototype,'width',
{
	get: function()  {return this.mWidth;},
	set: function(a) {this.mWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pillar.prototype,'baseWidth',
{
	get: function()  {return this.mbaseWidth;},
	set: function(a) {this.mbaseWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Pillar.prototype,'baseHeight',
{
	get: function()  {return this.mbaseHeight;},
	set: function(a) {this.mbaseHeight=a; this.needAdjust=true;}
});

Mecho.Pillar.prototype.adjustNormals = function()
{
	this.dx = this.baseHeight;
	this.dy = this.baseWidth/2-this.width/2;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;
	//if (this.dy<0) this.dy = -this.dy;
	this.needAdjust = false;
}

Mecho.Pillar.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,(relX)*this.height]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,(relZ)*this.height]);
}

Mecho.Pillar.prototype.onMaterial = function()
{
	// material has changed - set tiles for the bases if the
	// material for the bases has tiles
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[2] = this.material[1].tiles[0];
		this.tiles[3] = this.material[1].tiles[1];
	}
}

function pillar(center,height,width,baseHeight,baseWidth,custom)
{
	return new Mecho.Pillar(center,height,width,baseHeight,baseWidth,custom);
}
﻿//===================================================
//
// Module:  Rail
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		rail(center)
//		rail(center,length)
//		rail(center,length,width)
//		rail(center,length,width,baseWidth)
//		rail(center,length,width,baseWidth,otherWidth)
//
// Properties:
//		width
//		baseWidth
//		otherWidth 
//		tiles - tx,ty of rod, tx,ty of base, tx,ty of other base
//		atPoint()
//
//===================================================

Mecho.Rail = function(center,length,width,baseWidth,otherWidth,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.length = length||10;
	this.width = width||0.3;
	this.baseWidth = baseWidth||this.width*2;
	this.otherWidth = otherWidth||this.baseWidth;
	
	var tr = Mecho.N(PI*this.width/2);
	this.tiles = [tr,Mecho.N(this.length),tr,tr/2,tr,tr/2];
	
	this.custom(this.customValues);
}

Mecho.Rail.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Rail.prototype.drawFaces = function()
{
	// draw the rod
	this.prepareMaterial(0);

	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.length);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.length/2);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	this.prepareMaterial(1);
	
	// draw ball A (at 0)
	if (this.baseWidth>=this.width)
	{
		this.ctx.gl.uniform3f(this.ctx.uScale,this.baseWidth/2,this.baseWidth/2,this.baseWidth/2);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
		this.ctx.geometrySphere[this.nice].drawFaces();
	}

	// draw ball B (at 1)
	if (this.otherWidth>=this.width)
	{
		this.ctx.gl.uniform3f(this.ctx.uScale,this.otherWidth/2,this.otherWidth/2,this.otherWidth/2);
		this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[4],this.tiles[5]);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.length);
		this.ctx.geometrySphere[this.nice].drawFaces();
	}

	this.ctx.gl.uniform3fv(this.ctx.uPos,[0,0,0]);
}

Mecho.Rail.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.length]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.length]);
}

function rail(center,length,width,baseWidth,otherWidth,custom)
{
	return new Mecho.Rail(center,length,width,baseWidth,otherWidth,custom);
}
﻿//===================================================
//
// Module:  Ring
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		ring(center,width,height,baseWidth,baseHeight)
//
// Properties:
//		width
//		height
//		baseWidth
//		baseHeight
//		tiles - [cir, in-h, out-h, slope]
//		gears
//
//===================================================

Mecho.Ring = function(center,width,height,baseWidth,baseHeight,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.width = width||5;
	this.mHeight = height||2;
	this.mBaseWidth = baseWidth||1;
	this.mBaseHeight = baseHeight||this.mHeight/2;
	this.gears = 1;
	
	this.nice = Mecho.VERYTRUE;

	this.tiles = [
		Mecho.N(2*PI*(this.width/2-this.baseWidth)),	// periferal outer & inner
		Mecho.N(this.height),		// vertical inside
		Mecho.N(this.baseHeight),		// vertical outside
		Mecho.N(this.baseWidth),		// slope periferal
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Ring.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Ring.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw internal surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform1i(this.ctx.uSharpCone,true);
	this.ctx.gl.uniform1f(this.ctx.uGears,this.gears*20*this.width);
	this.ctx.gl.uniform1f(this.ctx.uTeeth,1);
	this.ctx.gl.uniform3f(this.ctx.uScale,-this.width/2,-this.width/2,this.height);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();
	this.ctx.gl.uniform1f(this.ctx.uTeeth,0);

	// draw external surface
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2+this.baseWidth,this.width/2+this.baseWidth,this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[2]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw sloped surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2+this.baseWidth,this.dx,this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform4f(this.ctx.uRr,this.width/2,this.width/2+this.baseWidth,
		this.dx,-this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,-(-this.height+this.baseHeight)/2);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,-this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();

	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);
	this.ctx.gl.uniform1i(this.ctx.uSharpCone,false);
}

Object.defineProperty(Mecho.Ring.prototype,'height',
{
	get: function()  {return this.mHeight;},
	set: function(a) {this.mHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Ring.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Ring.prototype,'baseWidth',
{
	get: function()  {return this.mBaseWidth;},
	set: function(a) {this.mBaseWidth=a; this.needAdjust=true;}
});

Mecho.Ring.prototype.adjustNormals = function()
{
	this.dx = (this.height-this.baseHeight)/2;
	this.dy = this.baseWidth;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;

	this.needAdjust = false;
}

Mecho.Ring.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([relX*this.width/2,0,0]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

function ring(center,width,height,baseWidth,baseHeight,custom)
{
	return new Mecho.Ring(center,width,height,baseWidth,baseHeight,custom);
}
﻿//===================================================
//
// Module:  Tube
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		tube(center)
//		tube(center,height)
//		tube(center,height,width)
//		tube(center,height,width,baseHeight)
//		tube(center,height,width,baseHeight,baseWidth)
//
// Properties:
//		height
//		radius
//		baseHeight
//		baseWidth
//		tiles - [x-rod,y-rod,x-base,y-base]
//		hollow - affects bottom base
//
//===================================================

Mecho.Tube = function(center,height,width,baseHeight,baseWidth,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;
	
	this.center = center;
	this.height = height||4;
	this.mWidth = width||1;
	this.mBaseWidth = baseWidth||this.mWidth/2;
	this.mBaseHeight = baseHeight||Math.min(this.mWidth-this.mBaseWidth,this.height/6);

	this.needAdjust = true;
	this.nice = true;
	this.hollow = false;

	this.tiles = [
		Mecho.N(2*PI*this.width/2),	// horizontal side
		Mecho.N(this.height-2*this.baseHeight),		// vertical side
		Mecho.N(2*PI*this.width/2),		// x axis base
		Mecho.N(this.height)*this.baseHeight/this.height,		// y axis base
	];
	
	// calculate changes for normal vectors
	this.adjustNormals();
	
	this.custom(this.customValues);
}


Mecho.Tube.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Tube.prototype.drawFaces = function()
{
	if (this.needAdjust) this.adjustNormals();
	
	// draw rod surface
	this.prepareMaterial(0);
	this.ctx.gl.uniform3f(this.ctx.uScale,this.width/2,this.width/2,this.height-2*this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[0],this.tiles[1]);
	this.ctx.geometryCylinder[this.nice].drawFaces();

	// draw base surface
	this.ctx.gl.uniform4f(this.ctx.uRr,this.baseWidth/2,this.width/2,
		this.dx,-this.dy);
	this.ctx.gl.uniform3f(this.ctx.uScale,1,1,-this.baseHeight);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,this.height/2);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,this.tiles[2],this.tiles[3]);
	this.ctx.geometryCone[this.nice].drawFaces();
	if (!this.hollow)
	{
		this.ctx.gl.uniform4f(this.ctx.uRr,this.baseWidth/2,this.width/2,
			this.dx,this.dy);
		this.ctx.gl.uniform3f(this.ctx.uScale,1,1,this.baseHeight);
		this.ctx.gl.uniform3f(this.ctx.uPos,0,0,-this.height/2);
		this.ctx.geometryCone[this.nice].drawFaces();
	}
	this.ctx.gl.uniform4f(this.ctx.uRr,1,1,1,0);
}

Object.defineProperty(Mecho.Tube.prototype,'width',
{
	get: function()  {return this.mWidth;},
	set: function(a) {this.mWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Tube.prototype,'baseWidth',
{
	get: function()  {return this.mBaseWidth;},
	set: function(a) {this.mBaseWidth=a; this.needAdjust=true;}
});

Object.defineProperty(Mecho.Tube.prototype,'baseHeight',
{
	get: function()  {return this.mBaseHeight;},
	set: function(a) {this.mBaseHeight=a; this.needAdjust=true;}
});

Mecho.Tube.prototype.adjustNormals = function()
{
	this.dx = this.baseHeight;
	this.dy = this.baseWidth-this.width;
	var d = Math.sqrt(this.dx*this.dx+this.dy*this.dy);
	this.dx = this.dx/d;
	this.dy = this.dy/d;

	this.needAdjust = false;
}

/*
Mecho.Tube.prototype.onMaterial = function()
{
	// material has changed - set tiles for the bases if the
	// material for the bases has tiles
	if (this.material[1] && this.material[1].tiles)
	{
		this.tiles[2] = this.material[1].tiles[0];
		this.tiles[3] = this.material[1].tiles[1];
	}
}
*/

Mecho.Tube.prototype.atPoint = function(relX,relY,relZ)
{
	if (relY===undefined) // atPoint(z)
		return this.point([0,0,relX*this.height/2]);
	else // atPoint(x,y,z)
		return this.point([relX*this.width/2,relY*this.width/2,relZ*this.height/2]);
}

function tube(center,height,width,baseHeight,baseWidth,custom)
{
	return new Mecho.Tube(center,height,width,baseHeight,baseWidth,custom);
}
﻿//===================================================
//
// Module:  Geometry
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
//===================================================

Mecho.VERYTRUE = 1;
Mecho.PENCIL = 2;
Mecho.prototype.defineGeometries = function()
{
	this.geometryGround = new Mecho.GeometryGround(this);
	this.geometryCube = new Mecho.GeometryCube(this);
	this.geometrySphere = [];
	this.geometrySphere[false] = new Mecho.GeometrySphere(this,16);
	this.geometrySphere[true]  = new Mecho.GeometrySphere(this,44);
	this.geometrySphere[Mecho.PENCIL]  = new Mecho.GeometrySphere(this,6);
	this.geometryCylinder = [];
	this.geometryCylinder[false] = new Mecho.GeometryCylinder(this,16);
	this.geometryCylinder[true]  = new Mecho.GeometryCylinder(this,44);
	this.geometryCylinder[Mecho.VERYTRUE]  = new Mecho.GeometryCylinder(this,80);
	this.geometryCylinder[Mecho.PENCIL]  = new Mecho.GeometryCylinder(this,6);
	this.geometryCirclePlates = [];
	this.geometryCirclePlates[false] = new Mecho.GeometryCirclePlates(this,16);
	this.geometryCirclePlates[true]  = new Mecho.GeometryCirclePlates(this,44);
	this.geometryCone = [];
	this.geometryCone[false] = new Mecho.GeometryCone(this,16);
	this.geometryCone[true]  = new Mecho.GeometryCone(this,44);
	this.geometryCone[Mecho.VERYTRUE]  = new Mecho.GeometryCone(this,80);
	this.geometryCone[Mecho.PENCIL]  = new Mecho.GeometryCone(this,6);
}


//===================================================
//
// new GeometryGround(ctx)
//
// A square primitive object
//
//===================================================
Mecho.GeometryGround = function(ctx)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	var mesh = new Float32Array([
		-0.5,-0.5,0, 0,0, 0,0,1,
		 0.5,-0.5,0, 1,0, 0,0,1,
		-0.5, 0.5,0, 0,1, 0,0,1,
		 0.5, 0.5,0, 1,1, 0,0,1]);
	
	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryGround.prototype.drawFaces = function(tx,ty)
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	this.ctx.gl.uniform2f(this.ctx.uTexScale,tx,ty);
	gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}



//===================================================
//
// new GeometryCube(ctx)
//
// A cubic primitive object. Top and bottom faces drawn if
// obj.hollow is false.
//
//===================================================
Mecho.GeometryCube = function(ctx)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	//	  7-------6				Texture:
	//	 /|		 /|				
	//	4-------5 |				3---2
	//	| 3-----|-2				|   |
	//	|/	  	|/				0---1
	//	0-------1
	
	// normals
	var nX = [+1,0,0], nY = [0,+1,0], nZ = [0,0,+1];
	var nx = [-1,0,0], ny = [0,-1,0], nz = [0,0,-1];
	// textures
	var t0 = [0,0], t1 = [1,0], t2 = [1,1], t3 = [0,1],
	    t4 = [0,1], t5 = [1,1], t6 = [2,1], t7 = [3,1];
	// vertices
	var	v0 = [+0.5,-0.5,-0.5], v4 = [+0.5,-0.5,+0.5],
		v1 = [+0.5,+0.5,-0.5], v5 = [+0.5,+0.5,+0.5],
		v2 = [-0.5,+0.5,-0.5], v6 = [-0.5,+0.5,+0.5],
		v3 = [-0.5,-0.5,-0.5], v7 = [-0.5,-0.5,+0.5];

	var mesh = new Float32Array([].concat(
	// solid cube 36x8
		v0,t0,nX,	v1,t1,nX,	v4,t3,nX,	v4,t3,nX,	v1,t1,nX,	v5,t2,nX,	//front  X+
		v3,t1,nx,	v7,t2,nx,	v2,t0,nx,	v2,t0,nx,	v7,t2,nx,	v6,t3,nx,	//back   X-
		v5,t3,nY,	v1,t0,nY,	v6,t2,nY,	v6,t2,nY,	v1,t0,nY,	v2,t1,nY,	//right  Y+
		v7,t3,ny,	v3,t0,ny,	v4,t2,ny,	v4,t2,ny,	v3,t0,ny,	v0,t1,ny,	//left   Y-
		v4,t1,nZ,	v5,t2,nZ,	v7,t0,nZ,	v7,t0,nZ,	v5,t2,nZ,	v6,t3,nZ,	//top    Z+
		v0,t1,nz,	v3,t0,nz,	v1,t2,nz,	v1,t2,nz,	v3,t0,nz,	v2,t3,nz,	//bottom Z-
	[]));
	
	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCube.prototype.drawFaces = function(obj,m,tx,ty,tz)
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	// draw +X and -X
	this.ctx.gl.uniform2f(this.ctx.uTexScale,ty,tz);
	gl.drawArrays(gl.TRIANGLES,0,12);
	
	// draw +Y and -Y
	this.ctx.gl.uniform2f(this.ctx.uTexScale,tx,tz);
	gl.drawArrays(gl.TRIANGLES,12,12);

	// draw +Z and -Z
	if (m) obj.prepareMaterial(m);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,tx,ty);
	gl.drawArrays(gl.TRIANGLES,24,12);
}



//===================================================
//
// new GeometrySphere(ctx)
//
// A spherical primitive object. Texture sizes derived
// from obj.tiling=[tx,ty].
//
//===================================================
Mecho.GeometrySphere = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	this.NV = Math.round(n/2); // vertical precision
	if (n<=6) this.NV = 4; // for pencil tops
	
	var data = [];

	var b = -Math.PI/2;
	var db = Math.PI/this.NV;
	var tv = 0;
	var dtv = 1/this.NV;

	for( var j=0; j<this.NV; j++ )
	{
		var a = 0;
		var da = 2*Math.PI/this.NU;
		var tu = 0;
		var dtu = 1/this.NU;
	
		for( var i=0; i<this.NU+1; i++ )
		{
			var x = Math.cos(a)*Math.cos(b+db);
			var y = Math.sin(a)*Math.cos(b+db);
			var z = Math.sin(b+db); 

			data.push(x,y,z, tu,tv+dtv,	x,y,z);

			x = Math.cos(a)*Math.cos(b);
			y = Math.sin(a)*Math.cos(b);
			z = Math.sin(b); 

			data.push(x,y,z, tu,tv,	x,y,z);

			a += da;
			tu += dtu;
		}

		b += db;
		tv += dtv;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometrySphere.prototype.drawFaces = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	for( var j=0; j<this.NV; j++ ) gl.drawArrays(gl.TRIANGLE_STRIP,(2*this.NU+2)*j,2*this.NU+2); // draw horizontal band
}



//===================================================
//
// new GeometryCylinder(ctx)
//
// A cylindrical primitive object. Drawn without bases.
//
//===================================================
Mecho.GeometryCylinder = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	
	var data = [];

	var a = 0;
	var da = 2*Math.PI/this.NU;
	var tu = 0;
	var dtu = 1/this.NU;

	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,-0.5, tu,0,	x,y,0);
		data.push(x,y,+0.5, tu,1,	x,y,0);

		a += da;
		tu += dtu;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCylinder.prototype.drawFaces = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	gl.drawArrays(gl.TRIANGLE_STRIP,0,2*this.NU+2); // draw horizontal band
}



//===================================================
//
// new GeometryCirclePlates(ctx)
//
// A circular primitive object - two coplanar plates.
//
//===================================================
Mecho.GeometryCirclePlates = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	
	var data = [];

	var a = 0;
	var da = 2*Math.PI/this.NU;

	// upper circle
	data.push(0,0,0.5, 0.5,0.5,	0,0,1);
	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,0.5, x/2+0.5,y/2+0.5,	x,y,4);

		a += da;
	}
	// lower circle
	data.push(0,0,-0.5, 0.5,0.5,	x,y,-4);
	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,-0.5, x/2+0.5,y/2+0.5,	0,0,-1);

		a += da;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCirclePlates.prototype.drawFaces = function(rLower,rUpper,height)
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	if (rUpper)
	{
		gl.uniform3f(this.ctx.uScale,rUpper,rUpper,height);
		gl.drawArrays(gl.TRIANGLE_FAN,0,this.NU+2);
	}
	if (rLower)
	{
		gl.uniform3f(this.ctx.uScale,rLower,rLower,height);
		gl.drawArrays(gl.TRIANGLE_FAN,this.NU+2,this.NU+2);
	}
}



//===================================================
//
// new GeometryCone(ctx)
//
// A conical primitive object. Drawn without bases.
// Originally looks like a cylinder from z=0 to z=1.
//
//===================================================
Mecho.GeometryCone = function(ctx,n)
{
	this.ctx = ctx;
	var gl = ctx.gl;
			
	this.NU = n;	// horizontal precision
	
	var data = [];

	var a = 0;
	var da = 2*Math.PI/this.NU;
	var tu = 0;
	var dtu = 1/this.NU;

	for( var i=0; i<this.NU+1; i++ )
	{
		var x = Math.cos(a);
		var y = Math.sin(a);

		data.push(x,y,0, tu,1,	x,y,0);
		data.push(x,y,1, tu,0,	x,y,0);

		a += da;
		tu += dtu;
	}

	var mesh = new Float32Array(data);

	this.buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
}

Mecho.GeometryCone.prototype.drawFaces = function()
{
	var gl = this.ctx.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
	gl.vertexAttribPointer(this.ctx.aXYZ,3,gl.FLOAT,false,8*Mecho.FLOATS,0*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aNormal,3,gl.FLOAT,false,8*Mecho.FLOATS,5*Mecho.FLOATS);
	gl.vertexAttribPointer(this.ctx.aTexCoord,2,gl.FLOAT,false,8*Mecho.FLOATS,3*Mecho.FLOATS);

	gl.drawArrays(gl.TRIANGLE_STRIP,0,2*this.NU+2); // draw horizontal band
}
﻿//===================================================
//
// Module:  Ground
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		new Mecho.Ground({scale,width})
//		ground({scale,width})
//
// Properties:
//		size
//		tiles - [scale,scale]
//
//===================================================

Mecho.Ground = function(size,custom)
{
	Mecho.Mecholet.apply(this,arguments);
	arguments[this.customIndex] = undefined;

	this.center = [0,0,0];
	this.size = size||10000;
	this.tiles = [Mecho.N(this.size),Mecho.N(this.size)];

	// remember the ground in the Mecho object
	// and remove it from the list of user objects
	this.ctx.groundObject = this.ctx.mecholetList.pop();
	
	this.custom(this.customValues);
}

Mecho.Ground.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Ground.prototype.drawFaces = function()
{
	this.ctx.gl.uniform3f(this.ctx.uScale,this.size,this.size,1);
	this.ctx.gl.uniform3f(this.ctx.uPos,0,0,0);

	this.prepareMaterial(0);
	this.ctx.gl.uniform1i(this.ctx.uLight,0);
	this.ctx.geometryGround.drawFaces(this.tiles[0],this.tiles[1]);
}


Mecho.Ground.prototype.onMaterial = function()
{
	this.tiles[0] = Mecho.N(this.size/this.material[0].groundScale);
	this.tiles[1] = this.tiles[0];
}﻿//===================================================
//
// Module:  Target
// Library:	Mecho 4.0
// License:	CC-3.0 SA NC
//
// Constructors:
//		new Mecho.Target()
//
//===================================================

Mecho.Target = function()
{
	Mecho.Mecholet.apply(this,arguments);
	this.material = Mecho.CHECK;
	this.ctx.targetObject = this.ctx.mecholetList.pop();
	this.visible = false;

	this.buffer = this.ctx.gl.createBuffer();
	var a=1, b=2.5;
	var data = [
		-a,0,0,-b,0,0,
		+a,0,0,+b,0,0,
		0,-a,0,0,-b,0,
		0,+a,0,0,+b,0,
		0,0,-a,0,0,-b,
		0,0,+a,0,0,+b,
	];	
	var mesh = new Float32Array(data);	
		
	this.ctx.gl.bindBuffer(this.ctx.gl.ARRAY_BUFFER,this.buffer);
	this.ctx.gl.bufferData(this.ctx.gl.ARRAY_BUFFER,mesh,this.ctx.gl.STATIC_DRAW);
}


Mecho.Target.prototype = Object.create(Mecho.Mecholet.prototype);
Mecho.Target.prototype.drawFaces = function()
{
	var RAD = 0.7;
	
	// draw ball
	this.prepareMaterial(0);
	this.ctx.gl.uniform2f(this.ctx.uTexScale,1,1);
	this.ctx.gl.uniform3f(this.ctx.uScale,RAD,RAD,RAD);
	this.ctx.geometrySphere[true].drawFaces();

	this.ctx.gl.uniform3f(this.ctx.uScale,2*RAD,2*RAD,2*RAD);
	this.ctx.gl.bindBuffer(this.ctx.gl.ARRAY_BUFFER,this.buffer);
	this.ctx.gl.vertexAttribPointer(this.ctx.aXYZ,3,this.ctx.gl.FLOAT,false,3*Mecho.FLOATS,0*Mecho.FLOATS);
	this.ctx.gl.disableVertexAttribArray(this.ctx.aNormal);
	this.ctx.gl.disableVertexAttribArray(this.ctx.aTexCoord);
	this.ctx.gl.bindTexture(this.ctx.gl.TEXTURE_2D,null);
	this.ctx.gl.uniform1i(this.ctx.uTexture,false);
	this.ctx.gl.uniform1i(this.ctx.uLight,false);
	var c = 0.2;
	this.ctx.gl.uniform3fv(this.ctx.uColor,[c,c,c]);
	this.ctx.gl.drawArrays(this.ctx.gl.LINES,0,12);
}
