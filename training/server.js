import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the current directory
app.use(express.static(__dirname));

// Add a route to list photos
app.get('/list-photos', (req, res) => {
    const photosDir = path.join(__dirname, 'photos');
    try {
        if (!fs.existsSync(photosDir)) {
            fs.mkdirSync(photosDir, { recursive: true });
        }
        const files = fs.readdirSync(photosDir);
        const imageFiles = files.filter(file =>
            /\.(jpg|jpeg|png)$/i.test(file)
        );
        res.json({ success: true, files: imageFiles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ensure pose_results directory exists
const poseResultsDir = path.join(__dirname, 'pose_results');
if (!fs.existsSync(poseResultsDir)) {
    fs.mkdirSync(poseResultsDir, { recursive: true });
}

app.post('/save', async (req, res) => {
    try {
        const { filename, imageData, jsonData } = req.body;
        const baseName = path.parse(filename).name;

        // Save PNG file
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const pngPath = path.join(poseResultsDir, `${baseName}_pose.png`);
        fs.writeFileSync(pngPath, base64Data, 'base64');

        // Save JSON file
        const jsonPath = path.join(poseResultsDir, `${baseName}_pose.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

        res.json({ success: true, message: `Saved files for ${filename}` });
    } catch (error) {
        console.error('Error saving files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/save-results', async (req, res) => {
    try {
        const { baseFileName, visualizationData, poseData } = req.body;

        // Save visualization PNG file
        const pngPath = path.join(poseResultsDir, `${baseFileName}_pose.png`);
        fs.writeFileSync(pngPath, visualizationData, 'base64');

        // Save pose data JSON file
        const jsonPath = path.join(poseResultsDir, `${baseFileName}_pose.json`);
        fs.writeFileSync(jsonPath, poseData);

        res.json({
            success: true,
            message: `Saved results for ${baseFileName}`,
            files: {
                visualization: pngPath,
                poseData: jsonPath
            }
        });
    } catch (error) {
        console.error('Error saving results:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 