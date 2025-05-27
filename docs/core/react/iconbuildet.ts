<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sponsor Icon Builder</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f7;
            color: #333;
        }
        h1 {
            color: #0066cc;
            text-align: center;
            margin-bottom: 30px;
        }
        .container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 30px;
        }
        .controls {
            flex: 1;
            min-width: 300px;
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .preview {
            flex: 1;
            min-width: 300px;
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        input, select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        input[type="color"] {
            height: 40px;
        }
        button {
            background-color: #0066cc;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
            margin-top: 10px;
        }
        button:hover {
            background-color: #0055aa;
        }
        .icon-preview {
            margin-top: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .size-examples {
            display: flex;
            gap: 15px;
            margin-top: 20px;
        }
        .size-example {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .export-options {
            margin-top: 20px;
            text-align: center;
        }
        .code-display {
            margin-top: 20px;
            background-color: #f5f5f7;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 150px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <h1>Sponsor Icon Builder</h1>
    
    <div class="container">
        <div class="controls">
            <div class="form-group">
                <label for="icon-text">Icon Text (1-2 characters recommended)</label>
                <input type="text" id="icon-text" value="S" maxlength="2">
            </div>
            
            <div class="form-group">
                <label for="background-color">Background Color</label>
                <input type="color" id="background-color" value="#0066cc">
            </div>
            
            <div class="form-group">
                <label for="text-color">Text Color</label>
                <input type="color" id="text-color" value="#ffffff">
            </div>
            
            <div class="form-group">
                <label for="shape">Shape</label>
                <select id="shape">
                    <option value="circle">Circle</option>
                    <option value="rounded-square">Rounded Square</option>
                    <option value="square">Square</option>
                    <option value="hexagon">Hexagon</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="font-family">Font</label>
                <select id="font-family">
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Segoe UI', sans-serif">Segoe UI</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="'Helvetica Neue', sans-serif">Helvetica Neue</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Georgia, serif">Georgia</option>
                </select>
            </div>
            
            <button id="update-btn">Update Icon</button>
        </div>
        
        <div class="preview">
            <h3>Preview</h3>
            <div class="icon-preview">
                <svg id="icon-svg" width="100" height="100" viewBox="0 0 100 100"></svg>
            </div>
            
            <div class="size-examples">
                <div class="size-example">
                    <svg id="icon-small" width="32" height="32" viewBox="0 0 100 100"></svg>
                    <span>32px</span>
                </div>
                <div class="size-example">
                    <svg id="icon-medium" width="64" height="64" viewBox="0 0 100 100"></svg>
                    <span>64px</span>
                </div>
            </div>
            
            <div class="export-options">
                <button id="copy-svg-btn">Copy SVG Code</button>
                <button id="download-svg-btn">Download SVG</button>
            </div>
            
            <div class="code-display" id="svg-code">
                <!-- SVG code will be displayed here -->
            </div>
        </div>
    </div>
    
    <script>
        // DOM Elements
        const iconText = document.getElementById('icon-text');
        const backgroundColor = document.getElementById('background-color');
        const textColor = document.getElementById('text-color');
        const shape = document.getElementById('shape');
        const fontFamily = document.getElementById('font-family');
        const updateBtn = document.getElementById('update-btn');
        const iconSvg = document.getElementById('icon-svg');
        const iconSmall = document.getElementById('icon-small');
        const iconMedium = document.getElementById('icon-medium');
        const copySvgBtn = document.getElementById('copy-svg-btn');
        const downloadSvgBtn = document.getElementById('download-svg-btn');
        const svgCode = document.getElementById('svg-code');
        
        // Generate the SVG
        function generateSVG() {
            const text = iconText.value || 'S';
            const bgColor = backgroundColor.value;
            const txtColor = textColor.value;
            const selectedShape = shape.value;
            const selectedFont = fontFamily.value;
            
            let shapePath = '';
            let viewBox = '0 0 100 100';
            
            switch(selectedShape) {
                case 'circle':
                    shapePath = `<circle cx="50" cy="50" r="45" fill="${bgColor}"/>`;
                    break;
                case 'rounded-square':
                    shapePath = `<rect x="5" y="5" width="90" height="90" rx="15" ry="15" fill="${bgColor}"/>`;
                    break;
                case 'square':
                    shapePath = `<rect x="5" y="5" width="90" height="90" fill="${bgColor}"/>`;
                    break;
                case 'hexagon':
                    shapePath = `<polygon points="50,5 95,30 95,70 50,95 5,70 5,30" fill="${bgColor}"/>`;
                    break;
            }
            
            // Calculate font size based on text length
            const fontSize = text.length > 1 ? '40' : '50';
            
            const textElement = `<text x="50" y="50" font-family="${selectedFont}" font-size="${fontSize}" fill="${txtColor}" text-anchor="middle" dominant-baseline="central" font-weight="bold">${text}</text>`;
            
            const svgContent = shapePath + textElement;
            
            // Update all previews
            iconSvg.innerHTML = svgContent;
            iconSmall.innerHTML = svgContent;
            iconMedium.innerHTML = svgContent;
            
            // Update code display
            const fullSvgCode = `<svg width="100" height="100" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">\n  ${shapePath}\n  ${textElement}\n</svg>`;
            svgCode.textContent = fullSvgCode;
            
            return fullSvgCode;
        }
        
        // Initialize with default values
        generateSVG();
        
        // Event listeners
        updateBtn.addEventListener('click', generateSVG);
        
        // Also update when inputs change
        [iconText, backgroundColor, textColor, shape, fontFamily].forEach(input => {
            input.addEventListener('input', generateSVG);
        });
        
        // Copy SVG code
        copySvgBtn.addEventListener('click', () => {
            const svgString = generateSVG();
            navigator.clipboard.writeText(svgString)
                .then(() => {
                    alert('SVG code copied to clipboard!');
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    // Fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = svgString;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('SVG code copied to clipboard!');
                });
        });
        
        // Download SVG
        downloadSvgBtn.addEventListener('click', () => {
            const svgString = generateSVG();
            const blob = new Blob([svgString], {type: 'image/svg+xml'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sponsor-icon.svg';
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
    </script>
</body>
</html>