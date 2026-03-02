'use client';

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScrollStore } from '@/store/useScrollStore';

export default function CameraRig() {
    const offset = useScrollStore((state) => state.offset || 0);

    useFrame((state) => {
        const t = THREE.MathUtils.smoothstep(offset, 0, 1); // 0 → 1 as you scroll

        // ── 3-phase cinematic path ──
        // Phase 1 (t 0→0.45): Wide establishing shot → approach the orb
        // Phase 2 (t 0.45→0.7): Close up on the shell, dramatic zoom
        // Phase 3 (t 0.7→1): Push THROUGH the shell into the void

        const phase1End = 0.45;
        const phase2End = 0.7;

        let targetPos = new THREE.Vector3();
        let lookTarget = new THREE.Vector3();

        if (t < phase1End) {
            // ── Phase 1: Wide to Mid ──
            const p = t / phase1End; // 0→1
            targetPos.set(
                THREE.MathUtils.lerp(0, 0.3, p),
                THREE.MathUtils.lerp(1.4, 0.4, p),
                THREE.MathUtils.lerp(13.5, 4.5, p)
            );
            lookTarget.set(0, THREE.MathUtils.lerp(0.8, 0.1, p), 0);

        } else if (t < phase2End) {
            // ── Phase 2: Approach the shell ──
            const p = (t - phase1End) / (phase2End - phase1End); // 0→1
            const eased = p * p; // ease-in for building drama
            targetPos.set(
                THREE.MathUtils.lerp(0.3, 0.05, eased),
                THREE.MathUtils.lerp(0.4, 0.05, eased),
                THREE.MathUtils.lerp(4.5, 1.2, eased)  // just outside shell (radius ~0.82)
            );
            lookTarget.set(0, THREE.MathUtils.lerp(0.1, 0, eased), 0);

        } else {
            // ── Phase 3: Push through the shell into the void ──
            const p = (t - phase2End) / (1 - phase2End); // 0→1
            const eased = 1 - Math.pow(1 - p, 3); // ease-out (decelerate inside)
            targetPos.set(
                THREE.MathUtils.lerp(0.05, 0, eased),
                THREE.MathUtils.lerp(0.05, 0, eased),
                THREE.MathUtils.lerp(1.2, -0.5, eased)  // PAST the center, looking into the void
            );
            // Once inside, look FORWARD (away from the sphere) into deep space
            lookTarget.set(
                0,
                0,
                THREE.MathUtils.lerp(0, -10, eased)  // look deep into the void
            );
        }

        // Smooth interpolation for luxurious feel
        state.camera.position.lerp(targetPos, 0.065);

        // Create a temporary target to lerp the lookAt smoothly
        const currentLook = new THREE.Vector3();
        state.camera.getWorldDirection(currentLook);
        currentLook.multiplyScalar(10).add(state.camera.position);
        currentLook.lerp(lookTarget, 0.06);
        state.camera.lookAt(currentLook);

        // Very subtle cinematic roll
        state.camera.rotation.z = THREE.MathUtils.lerp(0, -0.015, t);
    });

    return null;
}
