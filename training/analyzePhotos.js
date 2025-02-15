import poseModule from '@mediapipe/pose';
import drawingUtils from '@mediapipe/drawing_utils';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';

const { Pose } = poseModule;
const { drawConnectors, drawLandmarks } = drawingUtils;

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to wait
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class PoseAnalyzer {
    constructor() {
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
    }

    async analyzePose(imageBuffer) {
        return new Promise((resolve, reject) => {
            this.pose.onResults((results) => {
                if (results.poseLandmarks) {
                    resolve({
                        landmarks: results.poseLandmarks.map(landmark => ({
                            x: landmark.x,
                            y: landmark.y,
                            z: landmark.z,
                            visibility: landmark.visibility
                        }))
                    });
                } else {
                    resolve(null);
                }
            });

            // Create an HTMLImageElement-like object
            const img = new Image();
            img.onload = async () => {
                try {
                    await this.pose.send({ image: img });
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = reject;

            // Convert buffer to base64 and set as source
            const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            img.src = base64Image;
        });
    }

    drawPoseOnCanvas(canvas, imageElement, poseData) {
        const ctx = canvas.getContext('2d');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;

        // Draw the original image
        ctx.drawImage(imageElement, 0, 0);

        if (!poseData || !poseData.landmarks) return;

        const landmarks = poseData.landmarks;

        // Define connections for different body parts
        const connections = {
            upperBody: [
                [11, 12], // shoulders
                [11, 13], [13, 15], // left arm
                [12, 14], [14, 16]  // right arm
            ],
            head: [
                [0, 1], [1, 2], [2, 3], [3, 7],
                [0, 4], [4, 5], [5, 6], [6, 8]
            ],
            torso: [
                [11, 23], // left shoulder to hip
                [12, 24], // right shoulder to hip
                [23, 24]  // hips
            ],
            lowerBody: [
                [23, 25], [25, 27], // left leg
                [24, 26], [26, 28]  // right leg
            ]
        };

        // Draw connections
        const colors = {
            upperBody: '#00FF00',
            head: '#FF0000',
            torso: '#0000FF',
            lowerBody: '#FFFF00'
        };

        for (const [part, connectionList] of Object.entries(connections)) {
            const color = colors[part];
            for (const [start, end] of connectionList) {
                const startPoint = landmarks[start];
                const endPoint = landmarks[end];

                if (startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
                    ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            }
        }

        // Draw landmarks
        landmarks.forEach((landmark) => {
            if (landmark.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(
                    landmark.x * canvas.width,
                    landmark.y * canvas.height,
                    5,
                    0,
                    2 * Math.PI
                );
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.stroke();
            }
        });
    }
}

async function processPhotos() {
    try {
        console.log('Starting photo processing...');
        console.log('Current directory:', __dirname);

        const analyzer = new PoseAnalyzer();

        // Get list of photos from the photos directory
        const photosDir = path.join(__dirname, 'photos');
        console.log('Looking for photos in:', photosDir);

        // Check if photos directory exists
        if (!fs.existsSync(photosDir)) {
            console.error('Photos directory does not exist:', photosDir);
            return;
        }

        const files = fs.readdirSync(photosDir);
        console.log('All files found:', files);

        const imageFiles = files.filter(file =>
            ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase())
        );
        console.log('Image files found:', imageFiles);

        if (imageFiles.length === 0) {
            console.log('No image files found in the photos directory. Please add some images.');
            return;
        }

        // Create output directory for results if it doesn't exist
        const outputDir = path.join(__dirname, 'pose_results');
        console.log('Creating output directory:', outputDir);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Process each image
        for (const imageFile of imageFiles) {
            console.log(`\nProcessing ${imageFile}...`);

            try {
                const imagePath = path.join(photosDir, imageFile);
                const imageBuffer = fs.readFileSync(imagePath);
                const img = await loadImage(imagePath);
                console.log('Image loaded successfully. Image dimensions:', img.width, 'x', img.height);

                // Analyze the pose with retry logic
                console.log('Analyzing pose...');
                let poseData = null;
                let attempts = 0;
                const maxAttempts = 3;

                while (!poseData && attempts < maxAttempts) {
                    try {
                        poseData = await analyzer.analyzePose(imageBuffer);
                        // Wait for 2 seconds to ensure proper processing
                        await delay(2000);
                    } catch (error) {
                        attempts++;
                        console.error(`Attempt ${attempts} failed:`, error);
                        if (attempts < maxAttempts) {
                            console.log('Retrying...');
                            await delay(1000);
                        }
                    }
                }

                console.log('Pose analysis complete. Results:', poseData ? 'Pose detected' : 'No pose detected');

                if (poseData) {
                    console.log('Pose detected, creating visualization...');
                    // Create a canvas for visualization
                    const canvas = createCanvas(img.width, img.height);
                    analyzer.drawPoseOnCanvas(canvas, img, poseData);

                    // Save the visualization as PNG
                    const visualizationPath = path.join(outputDir, `${path.parse(imageFile).name}_pose.png`);
                    console.log('Saving visualization to:', visualizationPath);
                    const buffer = canvas.toBuffer('image/png');
                    fs.writeFileSync(visualizationPath, buffer);
                    console.log('Visualization saved successfully');

                    // Save the pose data as JSON
                    const poseDataPath = path.join(outputDir, `${path.parse(imageFile).name}_pose.json`);
                    console.log('Saving pose data to:', poseDataPath);
                    fs.writeFileSync(poseDataPath, JSON.stringify(poseData, null, 2));
                    console.log('Pose data saved successfully');

                    console.log(`✓ Saved results for ${imageFile}:`);
                    console.log(`  - Visualization: ${visualizationPath}`);
                    console.log(`  - Pose data: ${poseDataPath}`);
                } else {
                    console.log(`✗ No pose detected in ${imageFile}`);
                }

                // Wait for a moment before processing the next image
                await delay(500);
            } catch (err) {
                console.error(`✗ Error processing ${imageFile}:`, err);
                console.error('Error details:', err.message);
                if (err.stack) console.error('Stack trace:', err.stack);
            }
        }

        console.log('\nProcessing complete! Check the pose_results directory for output files.');

        // List contents of output directory
        if (fs.existsSync(outputDir)) {
            console.log('\nContents of pose_results directory:');
            const outputFiles = fs.readdirSync(outputDir);
            outputFiles.forEach(file => console.log(`- ${file}`));
        }
    } catch (error) {
        console.error('Fatal error processing photos:', error);
        console.error('Error details:', error.message);
        if (error.stack) console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the processing
console.log('Starting the program...');
processPhotos().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
}); 