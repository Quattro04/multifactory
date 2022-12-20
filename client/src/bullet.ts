import THREE = require("three")

export class Bullet {
    uniqueId: number
    x: number
    z: number
    angle: number
    speed: number
    bullet: THREE.Object3D
    friendly: boolean

    constructor(uniqueId: number, x: number, z: number, angle: number, speed: number, friendly: boolean) {
        this.uniqueId = uniqueId
        this.x = x
        this.z = z
        this.angle = angle
        this.speed = speed;
        this.friendly = friendly
        this.bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 10, 10),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(0x000000)
            })
        )
        this.bullet.position.set(this.x, 1, this.z)
    }

    getObject = (): THREE.Object3D => {
        return this.bullet
    }

    updatePosition = () => {
        this.x += this.speed * Math.sin(this.angle + Math.PI);
        this.z += this.speed * Math.cos(this.angle + Math.PI);
        this.bullet.position.set(this.x, 1, this.z)
    }
}