import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface CassetteModelProps {
  fillA?: number
  fillB?: number
}

export function CassetteModel({}: CassetteModelProps) {
  const energyLevel = 0.5
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/cassette_tape.glb')

  const model = useMemo(() => {
    const clone = scene.clone(true)

    // Fix transparency bleed-through: the GLB material has alphaMode=BLEND + doubleSided
    // which causes back-faces to show through the shell. Force opaque.
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        const mat = (Array.isArray(child.material) ? child.material[0] : child.material) as THREE.MeshStandardMaterial
        if (mat?.isMeshStandardMaterial) {
          const m = mat.clone()
          m.transparent = false
          m.alphaTest = 0.01
          m.side = THREE.DoubleSide
          m.depthWrite = true
          child.material = m
        }
      }
    })

    // Auto-scale so max dimension ≈ 3.6 units, then center
    clone.scale.set(1, 1, 1)
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = 3.6 / Math.max(size.x, size.y, size.z)
    clone.scale.setScalar(s)

    const box2 = new THREE.Box3().setFromObject(clone)
    const center = new THREE.Vector3()
    box2.getCenter(center)
    clone.position.sub(center)

    return clone
  }, [scene])

  const swaySpeed  = 0.12 + energyLevel * 0.22
  const floatSpeed = 0.28 + energyLevel * 0.38
  const swayAmt    = 0.07 + energyLevel * 0.10

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.y = Math.sin(t * swaySpeed) * swayAmt
    groupRef.current.rotation.x = Math.sin(t * (swaySpeed * 0.6)) * 0.025
    groupRef.current.position.y = Math.sin(t * floatSpeed) * 0.06
  })

  return (
    <group ref={groupRef}>
      <primitive object={model} />
      {/* Dark fill behind the cassette window to hide inner geometry */}
      <mesh position={[0, 0.18, 0.15]} castShadow>
        <planeGeometry args={[2.2, 1.0]} />
        <meshStandardMaterial color="#080606" roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

useGLTF.preload('/models/cassette_tape.glb')
