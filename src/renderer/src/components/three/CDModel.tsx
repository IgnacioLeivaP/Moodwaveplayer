import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

export function CDModel() {
  const energyLevel = 0.5
  const groupRef = useRef<THREE.Group>(null)

  const obj     = useLoader(OBJLoader, '/models/CD.obj')
  const texture = useLoader(THREE.TextureLoader, '/models/CdUvMap.png')

  const model = useMemo(() => {
    const clone = obj.clone(true)

    // Apply UV texture to every mesh
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: texture,
          metalness: 0.88,
          roughness: 0.06,
          envMapIntensity: 1.2
        })
        child.castShadow = true
      }
    })

    // Auto-scale so the disc diameter ≈ 3.2 units, then center
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    // For a disc the dominant dimensions are x/z; normalise to those
    const flatMax = Math.max(size.x, size.z)
    const s = flatMax > 0 ? 3.2 / flatMax : 1
    clone.scale.setScalar(s)

    const box2 = new THREE.Box3().setFromObject(clone)
    const center = new THREE.Vector3()
    box2.getCenter(center)
    clone.position.sub(center)

    return clone
  }, [obj, texture])

  const spinSpeed  = 0.0015 + energyLevel * 0.012
  const floatSpeed = 0.28 + energyLevel * 0.35

  useFrame((state) => {
    if (!groupRef.current) return
    // Spin around Z — the disc faces the camera after the [PI/2,0,0] rotation below
    groupRef.current.rotation.z += spinSpeed
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * floatSpeed) * 0.07
  })

  return (
    // Slight tilt toward viewer
    <group rotation={[-0.25, 0, 0]}>
      <group ref={groupRef}>
        {/*
          OBJ disc lies flat on XZ plane (Y-up). Rotate -90° around X
          so the face points toward the camera (+Z direction).
        */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  )
}
