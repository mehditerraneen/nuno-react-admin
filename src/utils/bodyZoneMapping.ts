/**
 * Body Zone Mapping Utility
 *
 * Maps SVG coordinates (512x1024 viewBox) to anatomical body areas
 * Based on the Django template logic from add_wound.html
 *
 * Coordinate System:
 * - ViewBox: 512x1024 (width x height)
 * - Center line: x = 256
 * - Front view: zone_male_front / zone_female_front
 * - Back view: zone_male_back / zone_female_back
 */

export interface BodyZone {
    name: string;
    displayName: string;
    side: 'LEFT' | 'RIGHT' | 'CENTER';
    region: 'HEAD' | 'TORSO' | 'ARM' | 'LEG' | 'HAND' | 'FOOT';
}

/**
 * Determine side based on X coordinate
 * Center line is at x = 256
 */
export function getSideFromCoordinate(x: number): 'LEFT' | 'RIGHT' | 'CENTER' {
    const centerThreshold = 20; // Pixels from center to be considered "center"

    if (Math.abs(x - 256) < centerThreshold) {
        return 'CENTER';
    }

    // In medical terms, left/right is from the patient's perspective
    // But in SVG, left side of image is actually patient's right
    return x < 256 ? 'RIGHT' : 'LEFT';
}

/**
 * Get body region based on Y coordinate ranges
 */
export function getRegionFromCoordinate(y: number): 'HEAD' | 'TORSO' | 'ARM' | 'LEG' | 'HAND' | 'FOOT' {
    if (y < 150) return 'HEAD';
    if (y < 500) return 'TORSO';
    if (y < 700) return 'ARM';
    if (y < 900) return 'LEG';
    if (y < 1000) return 'FOOT';
    return 'FOOT';
}

/**
 * Map coordinates to detailed body area name (FRONT view)
 * Based on 80+ anatomical zones from Django template
 */
export function mapCoordinatesToBodyAreaFront(x: number, y: number): string {
    const side = getSideFromCoordinate(x);
    const region = getRegionFromCoordinate(y);

    // HEAD region (y < 150)
    if (y < 50) {
        return 'Forehead';
    }
    if (y < 100) {
        if (x < 220) return 'Right Eye';
        if (x > 290) return 'Left Eye';
        return 'Nose';
    }
    if (y < 150) {
        if (x < 230) return 'Right Cheek';
        if (x > 280) return 'Left Cheek';
        return 'Mouth/Chin';
    }

    // NECK region (y 150-200)
    if (y < 200) {
        return 'Neck';
    }

    // UPPER TORSO region (y 200-380)
    if (y < 380) {
        if (y < 280) {
            // Chest/Shoulders
            if (x < 150) return 'Right Shoulder';
            if (x > 360) return 'Left Shoulder';
            if (x < 220) return 'Right Chest';
            if (x > 290) return 'Left Chest';
            return 'Central Chest';
        }
        // Abdomen
        if (x < 220) return 'Right Abdomen';
        if (x > 290) return 'Left Abdomen';
        return 'Central Abdomen';
    }

    // PELVIS/HIP region (y 380-500)
    if (y < 500) {
        if (x < 220) return 'Right Hip';
        if (x > 290) return 'Left Hip';
        return 'Pelvis';
    }

    // UPPER ARM region (y 250-450, sides only)
    if (y < 450 && (x < 180 || x > 330)) {
        if (x < 180) return 'Right Upper Arm';
        return 'Left Upper Arm';
    }

    // FOREARM region (y 450-650, sides only)
    if (y < 650 && (x < 180 || x > 330)) {
        if (x < 180) return 'Right Forearm';
        return 'Left Forearm';
    }

    // HAND region (y 650-750, sides only)
    if (y < 750 && (x < 200 || x > 310)) {
        if (x < 200) return 'Right Hand';
        return 'Left Hand';
    }

    // UPPER LEG region (y 500-750)
    if (y < 750) {
        if (x < 220) return 'Right Thigh';
        if (x > 290) return 'Left Thigh';
        return 'Thigh';
    }

    // KNEE region (y 750-800)
    if (y < 800) {
        if (x < 220) return 'Right Knee';
        if (x > 290) return 'Left Knee';
        return 'Knee';
    }

    // LOWER LEG region (y 800-950)
    if (y < 950) {
        if (x < 220) return 'Right Lower Leg';
        if (x > 290) return 'Left Lower Leg';
        return 'Lower Leg';
    }

    // FOOT region (y 950-1024)
    if (x < 220) return 'Right Foot';
    if (x > 290) return 'Left Foot';
    return 'Foot';
}

/**
 * Map coordinates to detailed body area name (BACK view)
 */
export function mapCoordinatesToBodyAreaBack(x: number, y: number): string {
    const side = getSideFromCoordinate(x);

    // HEAD/NECK region (y < 200)
    if (y < 100) {
        return 'Back of Head';
    }
    if (y < 200) {
        return 'Back of Neck';
    }

    // UPPER BACK region (y 200-380)
    if (y < 380) {
        if (y < 280) {
            // Upper back/shoulders
            if (x < 150) return 'Right Shoulder Blade';
            if (x > 360) return 'Left Shoulder Blade';
            if (x < 220) return 'Right Upper Back';
            if (x > 290) return 'Left Upper Back';
            return 'Central Upper Back';
        }
        // Mid back
        if (x < 220) return 'Right Mid Back';
        if (x > 290) return 'Left Mid Back';
        return 'Central Mid Back (Spine)';
    }

    // LOWER BACK region (y 380-500)
    if (y < 500) {
        if (x < 220) return 'Right Lower Back';
        if (x > 290) return 'Left Lower Back';
        return 'Lower Spine/Sacrum';
    }

    // BUTTOCKS region (y 500-600)
    if (y < 600) {
        if (x < 220) return 'Right Buttock';
        if (x > 290) return 'Left Buttock';
        return 'Buttocks';
    }

    // UPPER ARM (back) region (y 250-450, sides only)
    if (y < 450 && (x < 180 || x > 330)) {
        if (x < 180) return 'Right Upper Arm (Back)';
        return 'Left Upper Arm (Back)';
    }

    // FOREARM (back) region (y 450-650, sides only)
    if (y < 650 && (x < 180 || x > 330)) {
        if (x < 180) return 'Right Forearm (Back)';
        return 'Left Forearm (Back)';
    }

    // HAND (back) region (y 650-750, sides only)
    if (y < 750 && (x < 200 || x > 310)) {
        if (x < 200) return 'Right Hand (Back)';
        return 'Left Hand (Back)';
    }

    // BACK OF THIGH region (y 600-750)
    if (y < 750) {
        if (x < 220) return 'Right Back Thigh';
        if (x > 290) return 'Left Back Thigh';
        return 'Back Thigh';
    }

    // BACK OF KNEE region (y 750-800)
    if (y < 800) {
        if (x < 220) return 'Right Back of Knee';
        if (x > 290) return 'Left Back of Knee';
        return 'Back of Knee';
    }

    // CALF region (y 800-950)
    if (y < 950) {
        if (x < 220) return 'Right Calf';
        if (x > 290) return 'Left Calf';
        return 'Calf';
    }

    // HEEL/FOOT region (y 950-1024)
    if (x < 220) return 'Right Heel';
    if (x > 290) return 'Left Heel';
    return 'Heel';
}

/**
 * Main function to map coordinates to body area
 */
export function mapCoordinatesToBodyArea(
    x: number,
    y: number,
    bodyView: 'FRONT' | 'BACK'
): string {
    if (bodyView === 'FRONT') {
        return mapCoordinatesToBodyAreaFront(x, y);
    } else {
        return mapCoordinatesToBodyAreaBack(x, y);
    }
}

/**
 * Validate coordinates are within the SVG viewBox
 */
export function validateCoordinates(x: number, y: number): boolean {
    return x >= 0 && x <= 512 && y >= 0 && y <= 1024;
}

/**
 * Get all possible body areas for autocomplete/dropdown
 */
export function getAllBodyAreas(): string[] {
    return [
        // Head
        'Forehead', 'Right Eye', 'Left Eye', 'Nose', 'Right Cheek', 'Left Cheek', 'Mouth/Chin',
        'Back of Head', 'Neck', 'Back of Neck',

        // Torso - Front
        'Right Shoulder', 'Left Shoulder', 'Right Chest', 'Left Chest', 'Central Chest',
        'Right Abdomen', 'Left Abdomen', 'Central Abdomen', 'Right Hip', 'Left Hip', 'Pelvis',

        // Torso - Back
        'Right Shoulder Blade', 'Left Shoulder Blade', 'Right Upper Back', 'Left Upper Back', 'Central Upper Back',
        'Right Mid Back', 'Left Mid Back', 'Central Mid Back (Spine)',
        'Right Lower Back', 'Left Lower Back', 'Lower Spine/Sacrum',
        'Right Buttock', 'Left Buttock', 'Buttocks',

        // Arms
        'Right Upper Arm', 'Left Upper Arm', 'Right Forearm', 'Left Forearm',
        'Right Upper Arm (Back)', 'Left Upper Arm (Back)', 'Right Forearm (Back)', 'Left Forearm (Back)',
        'Right Hand', 'Left Hand', 'Right Hand (Back)', 'Left Hand (Back)',

        // Legs
        'Right Thigh', 'Left Thigh', 'Thigh', 'Right Back Thigh', 'Left Back Thigh', 'Back Thigh',
        'Right Knee', 'Left Knee', 'Knee', 'Right Back of Knee', 'Left Back of Knee', 'Back of Knee',
        'Right Lower Leg', 'Left Lower Leg', 'Lower Leg', 'Right Calf', 'Left Calf', 'Calf',
        'Right Foot', 'Left Foot', 'Foot', 'Right Heel', 'Left Heel', 'Heel'
    ];
}
