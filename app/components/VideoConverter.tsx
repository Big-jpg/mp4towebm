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
    const [includeAudio, setIncludeAudio] = useState<boolean>(true);
    const [optimizationOption, setOptimizationOption] = useState<string>('none');

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
            setError('Only MP4 and WebM files newfag');
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

            // Build the appropriate FFmpeg command based on options
            let args: string[];

            // Base arguments for each format
            if (outputFormat === 'webm') {
                args = [
                    '-i', inputFileName,
                    '-c:v', 'vp8',  // Use vp8 for better compatibility than vp9
                ];
                
                // Handle audio
                if (includeAudio) {
                    args.push('-c:a', 'libvorbis');
                } else {
                    args.push('-an');  // No audio
                }
                
                // Handle optimization options
                switch (optimizationOption) {
                    case 'fps':
                        args.push('-r', '15');  // Limit to 15fps
                        args.push('-crf', '30', '-b:v', '0');
                        break;
                    case 'length':
                        args.push('-t', '30');
                        args.push('-crf', '30', '-b:v', '0');
                        break;
                    case 'quality':
                        args.push('-crf', '40', '-b:v', '0');  // Lower quality (higher CRF)
                        break;
                    case 'size':
                        args.push('-crf', '40', '-b:v', '0');  // Lower quality
                        args.push('-r', '15');  // Lower framerate
                        if (includeAudio) {
                            args.push('-b:a', '64k');  // Lower audio bitrate
                        }
                        break;
                    default:
                        args.push('-crf', '30', '-b:v', '0');  // Default quality
                }
            } else { // mp4
                args = [
                    '-i', inputFileName,
                    '-c:v', 'h264',
                ];
                
                // Handle audio
                if (includeAudio) {
                    args.push('-c:a', 'aac');
                } else {
                    args.push('-an');  // No audio
                }
                
                // Handle optimization options
                switch (optimizationOption) {
                    case 'fps':
                        args.push('-r', '15');  // Limit to 15fps
                        args.push('-crf', '23', '-preset', 'fast');
                        break;
                    case 'length':
                        args.push('-t', '30');
                        args.push('-crf', '23', '-preset', 'fast');
                        break;
                    case 'quality':
                        args.push('-crf', '35', '-preset', 'fast');  // Lower quality (higher CRF)
                        break;
                    case 'size':
                        args.push('-crf', '35', '-preset', 'fast');  // Lower quality
                        args.push('-r', '15');  // Lower framerate
                        if (includeAudio) {
                            args.push('-b:a', '64k');  // Lower audio bitrate
                        }
                        break;
                    default:
                        args.push('-crf', '23', '-preset', 'fast');  // Default quality
                }
            }

            // Add output filename
            args.push(outputFileName);

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
            setError('An error occurred during conversion. Please try force again.');
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
        <div className="reply p-2 m-4 border border-[#D9BFB7] bg-[#F0E0D6] max-w-md mx-auto">
            <div className="mb-2">
                <label htmlFor="videoFile" className="postblock bg-[#EA8] text-[#800] font-bold border border-[#800] px-2 py-0 text-[10pt]">
                    Select MP4 or WebM file (Max 10MB)
                </label>
                <input
                    type="file"
                    id="videoFile"
                    ref={fileInputRef}
                    accept=".mp4,.webm"
                    onChange={handleFileChange}
                    className="block w-full text-[10pt] font-arial border border-[#AAA] p-1 mt-1 focus:border-[#EA8]"
                />
            </div>

            {inputFile && (
                <div className="mb-2">
                    <p className="text-[10pt] font-arial mb-1">
                        <span className="font-bold">Selected file:</span> {inputFile.name}
                    </p>
                    <p className="text-[10pt] font-arial mb-2">
                        <span className="font-bold">Will convert to:</span> {outputFormat.toUpperCase()}
                    </p>
                    
                    {/* Audio toggle */}
                    <div className="mb-2">
                        <label className="flex items-center">
                            <input 
                                type="checkbox" 
                                checked={includeAudio}
                                onChange={() => setIncludeAudio(!includeAudio)}
                                className="mr-2"
                            />
                            <span className="text-[10pt] font-arial">
                                {includeAudio ? 'Include audio in output' : 'No audio in output'}
                            </span>
                        </label>
                    </div>

                    {/* Optimization options */}
                    <div className="mb-2">
                        <p className="postblock bg-[#EA8] text-[#800] font-bold border border-[#800] px-2 py-0 text-[10pt] mb-1">
                            Optimization options:
                        </p>
                        <div className="space-y-1">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="optimization"
                                    value="none"
                                    checked={optimizationOption === 'none'}
                                    onChange={() => setOptimizationOption('none')}
                                    className="mr-2"
                                />
                                <span className="text-[10pt] font-arial">Do not alter output</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="optimization"
                                    value="fps"
                                    checked={optimizationOption === 'fps'}
                                    onChange={() => setOptimizationOption('fps')}
                                    className="mr-2"
                                />
                                <span className="text-[10pt] font-arial">Optimize output - Limit FPS</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="optimization"
                                    value="length"
                                    checked={optimizationOption === 'length'}
                                    onChange={() => setOptimizationOption('length')}
                                    className="mr-2"
                                />
                                <span className="text-[10pt] font-arial">Optimize output - Limit File Length</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="optimization"
                                    value="quality"
                                    checked={optimizationOption === 'quality'}
                                    onChange={() => setOptimizationOption('quality')}
                                    className="mr-2"
                                />
                                <span className="text-[10pt] font-arial">Optimize output - Limit Quality</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="optimization"
                                    value="size"
                                    checked={optimizationOption === 'size'}
                                    onChange={() => setOptimizationOption('size')}
                                    className="mr-2"
                                />
                                <span className="text-[10pt] font-arial">Optimize output - Limit File Size (4MB)</span>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={convertVideo}
                        disabled={isConverting || isLoading}
                        className="w-full py-1 px-2 bg-[#EA8] text-[#800] font-bold border border-[#800] text-[10pt] hover:bg-[#FFFFEE] disabled:bg-[#D9BFB7] disabled:text-[#707070] disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Loading ffmpeg wasm client-side library...' : isConverting ? 'Converting file in browser...' : 'Convert'}
                    </button>
                </div>
            )}

            {(isConverting || isLoading) && (
                <div className="mb-2">
                    <div className="w-full bg-[#D9BFB7] h-2">
                        <div
                            className="bg-[#EA8] h-2"
                            style={{ width: `${isLoading ? 50 : progress}%` }}
                        ></div>
                    </div>
                    <p className="text-[10pt] font-arial text-center mt-1">
                        {isLoading ? 'Loading library...' : `${progress}% Complete`}
                    </p>
                </div>
            )}

            {error && (
                <div className="mb-2 p-2 bg-[#e62020] text-white font-mono text-[13px] font-bold">
                    {error}
                </div>
            )}

            {outputUrl && (
                <div className="mt-2">
                    <div className="mb-2">
                        <video
                            src={outputUrl}
                            controls
                            className="w-full"
                        />
                    </div>

                    <div className="flex space-x-2">
                        <a
                            href={outputUrl}
                            download={`converted.${outputFormat}`}
                            className="flex-1 py-1 px-2 bg-[#EA8] text-[#800] font-bold border border-[#800] text-[10pt] hover:bg-[#FFFFEE] text-center"
                        >
                            Download
                        </a>
                        <button
                            onClick={resetForm}
                            className="flex-1 py-1 px-2 bg-[#F0E0D6] text-[#800000] border border-[#D9BFB7] text-[10pt] hover:bg-[#FFFFEE]"
                        >
                            Convert Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}