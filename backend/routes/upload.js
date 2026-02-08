const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const stream = require('stream');

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'dq2xuef3w',
    api_key: '886332124535599',
    api_secret: 'S2hkJdoz6XRSoES9Zj9LTaa9V_c'
});

// Configure Multer (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload to Cloudinary via Stream
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'ads', // Optional: Organize in folder
                resource_type: 'auto' // Detect image/video
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error:', error);
                    return res.status(500).json({ error: 'Upload failed', details: error.message });
                }
                // Success
                res.json({ url: result.secure_url, public_id: result.public_id });
            }
        );

        // Pipe the buffer to the stream
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);
        bufferStream.pipe(uploadStream);

    } catch (error) {
        console.error('Upload Route Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
