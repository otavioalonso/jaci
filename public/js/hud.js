
class GaugeComponent {

    constructor(element_id) {
        this.speedGauge = document.getElementById(element_id);
        this.circles = this.speedGauge.getElementsByTagName('circle');
        this.whiteCircle = this.circles[1];
        this.colorfulCircle = this.circles[2];
        this.speedElement = this.speedGauge.getElementsByTagName('div')[0];
        this.hide();
    }

    setFracWhite(frac) {
        this.whiteCircle.style.setProperty('stroke-dashoffset', 400 - frac*0.75*(400-149));
    }

    setFracColored(frac) {
        this.colorfulCircle.style.setProperty('stroke-dashoffset', 400 - frac*0.75*(400-149));
    }

    setNumber(number) {
        this.speedElement.innerHTML = number;
    }

    hide() {
        this.speedGauge.style.display = 'none';
    }

    show() {
        this.speedGauge.style.display = 'block';
    }
 }

 class MapComponent {
    constructor(element_id) {
        this.mapElement = document.getElementById(element_id);
        this.lines = this.mapElement.getElementsByTagName('line');
        this.pointer = this.mapElement.getElementsByClassName('map-pointer')[0];
        this.direction = this.mapElement.getElementsByClassName('map-direction')[0];
        this.text = this.mapElement.getElementsByClassName('map-text')[0];
        this.hide();
    }

    setXY(x, y, z) {
        this.lines[0].setAttribute('x1', x/120 + 50);
        this.lines[0].setAttribute('x2', x/120 + 50);
        this.lines[1].setAttribute('y1', 50 - y/120);
        this.lines[1].setAttribute('y2', 50 - y/120);
        this.pointer.style.left = `${(x/120 + 50)*1.5 - 4}px`;
        this.pointer.style.bottom = `${(y/120 + 50)*1.5 - 4}px`;
        this.text.innerHTML = `(${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)})`;
    }

    setDirection(degrees) {
        this.direction.style.transform = `rotate(${degrees}deg)`;
    }

    hide() {
        this.mapElement.style.display = 'none';
    }

    show() {
        this.mapElement.style.display = 'block';
    }
 }

class ChartComponent {
constructor(element_id) {
    this.mapElement = document.getElementById(element_id);
    this.lines = this.mapElement.getElementsByTagName('line');
    this.pointer = this.mapElement.getElementsByClassName('map-pointer')[0];
    this.direction = this.mapElement.getElementsByClassName('map-direction')[0];
    this.text = this.mapElement.getElementsByClassName('map-text')[0];
    this.hide();
}

setCoords(ra, dec) {
    this.lines[0].setAttribute('x1', ra);
    this.lines[0].setAttribute('x2', ra);
    this.lines[1].setAttribute('y1', 90 - dec);
    this.lines[1].setAttribute('y2', 90 - dec);
    this.pointer.style.left = `${ra - 4}px`;
    this.pointer.style.bottom = `${(dec + 40) + 6}px`;
    
    this.text.innerHTML = `RA = ${((ra + 90) % 360).toFixed(1)}°,&nbsp;&nbsp;&nbsp;DEC = ${dec.toFixed(1)}°`;
}

setDirection(degrees) {
    this.direction.style.transform = `rotate(${degrees}deg)`;
}

hide() {
    this.mapElement.style.display = 'none';
}

show() {
    this.mapElement.style.display = 'block';
}
}

class HUDInfoComponent {
constructor(element_id) {
    this.infoElement = document.getElementById(element_id);
    this.redshift = this.infoElement.getElementsByClassName('redshift')[0].children[1];
    this.distance = this.infoElement.getElementsByClassName('comoving-distance')[0].children[1];
    this.hide();
}

setData(redshift, distance) {
    this.redshift.innerHTML = redshift;
    this.distance.innerHTML = distance;
}

hide() {
    this.infoElement.style.display = 'none';
}

show() {
    this.infoElement.style.display = 'block';
}
}