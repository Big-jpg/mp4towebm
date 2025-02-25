'use client';

import { useState, useRef, useEffect } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// Initialize FFmpeg - this only defines it, doesn't load it yet
const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js'
});

let ffmpegLoaded = false;

export default function VideoConverter() {
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [outputFormat, setOutputFormat] = useState<string>('');
    const [isConverting, setIsConverting] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [outputUrl, setOutputUrl] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) return;

        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size exceeds 10MB limit');
            return;
        }

        // Determine output format based on input format
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let newOutputFormat = '';

        if (fileExt === 'mp4') {
            newOutputFormat = 'webm';
        } else if (fileExt === 'webm') {
            newOutputFormat = 'mp4';
        } else {
            setError('Only MP4 and WebM files are supported');
            return;
        }

        setInputFile(file);
        setOutputFormat(newOutputFormat);
        setError('');
        setOutputUrl('');
    };

    // Convert the video
    const convertVideo = async () => {
        if (!inputFile || !outputFormat) return;

        try {
            setIsConverting(true);
            setProgress(0);
            setError('');

            // Load FFmpeg if not already loaded
            if (!ffmpegLoaded) {
                setIsLoading(true);
                await ffmpeg.load();
                ffmpegLoaded = true;
                setIsLoading(false);
            }

            // Get file extension and name
            const fileExt = inputFile.name.split('.').pop()?.toLowerCase();
            const fileName = inputFile.name.replace(`.${fileExt}`, '');

            // Create input and output file names
            const inputFileName = `input.${fileExt}`;
            const outputFileName = `${fileName}.${outputFormat}`;

            // Write the file to memory
            ffmpeg.FS('writeFile', inputFileName, await fetchFile(inputFile));

            // Build the appropriate FFmpeg command
            let args: string[];

            if (outputFormat === 'webm') {
                args = [
                    '-i', inputFileName,
                    '-c:v', 'vp8',  // Use vp8 for better compatibility than vp9
                    '-crf', '30',
                    '-b:v', '0',
                    outputFileName
                ];
            } else { // mp4
                args = [
                    '-i', inputFileName,
                    '-c:v', 'h264',
                    '-crf', '23',
                    '-preset', 'fast',  // Use 'fast' for better speed
                    outputFileName
                ];
            }

            // Set up progress tracking
            ffmpeg.setProgress(({ ratio }) => {
                setProgress(Math.round(ratio * 100));
            });

            // Run FFmpeg command to convert
            await ffmpeg.run(...args);

            // Read the result
            const data = ffmpeg.FS('readFile', outputFileName);

            // Create a URL for the output video
            const buffer = data.buffer instanceof ArrayBuffer ? data.buffer : new ArrayBuffer(data.buffer.byteLength);
            const blob = new Blob([buffer], { type: `video/${outputFormat}` });
            const url = URL.createObjectURL(blob);

            setOutputUrl(url);
            setProgress(100);
        } catch (err) {
            console.error('Conversion error:', err);
            setError('An error occurred during conversion. Please try again.');
        } finally {
            setIsConverting(false);
        }
    };

    // Reset the form
    const resetForm = () => {
        setInputFile(null);
        setOutputFormat('');
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Clean up previous URL
        if (outputUrl) {
            URL.revokeObjectURL(outputUrl);
            setOutputUrl('');
        }
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (outputUrl) {
                URL.revokeObjectURL(outputUrl);
            }
        };
    }, [outputUrl]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md mx-auto">
            <div className="mb-6">
                <label htmlFor="videoFile" className="block text-sm font-medium mb-2">
                    Select MP4 or WebM file (Max 10MB)
                </label>
                <input
                    type="file"
                    id="videoFile"
                    ref={fileInputRef}
                    accept=".mp4,.webm"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
            </div>

            {inputFile && (
                <div className="mb-6">
                    <p className="text-sm mb-2">
                        <span className="font-medium">Selected file:</span> {inputFile.name}
                    </p>
                    <p className="text-sm mb-4">
                        <span className="font-medium">Will convert to:</span> {outputFormat.toUpperCase()}
                    </p>

                    <button
                        onClick={convertVideo}
                        disabled={isConverting || isLoading}
                        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Loading conversion library...' : isConverting ? 'Converting...' : 'Convert'}
                    </button>
                </div>
            )}

            {(isConverting || isLoading) && (
                <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${isLoading ? 50 : progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm mt-2 text-center">
                        {isLoading ? 'Loading library...' : `${progress}% Complete`}
                    </p>
                </div>
            )}

            {error && (
                <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {outputUrl && (
                <div className="mt-6">
                    <div className="mb-4">
                        <video
                            src={outputUrl}
                            controls
                            className="w-full rounded-md shadow-sm"
                        />
                    </div>

                    <div className="flex space-x-3">
                        <a
                            href={outputUrl}
                            download={`converted.${outputFormat}`}
                            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-center"
                        >
                            Download
                        </a>

                        <button
                            onClick={resetForm}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Convert Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}