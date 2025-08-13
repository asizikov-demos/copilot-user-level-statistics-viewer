#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function main() {
    const username = '';
    const fileName = '';
    console.log(`Analyzing data for user "${username}"`);
    console.log('---');
    
    // Find the avocado report file
    const exampleDir = path.join(__dirname, '..', 'example');
    const files = fs.readdirSync(exampleDir);
    const avocadoFile = files.find(file => file.startsWith(fileName) && file.endsWith('.json'));

    if (!avocadoFile) {
        console.error('No avocado report file found in example directory');
        process.exit(1);
    }
    
    const filePath = path.join(exampleDir, avocadoFile);
    console.log(`Reading report: ${avocadoFile}`);
    console.log('---');
    
    // Read and parse the JSONL file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.trim().split('\n');

    const userData = [];

    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
                        
            if (entry.user_login === username) {
                const dayData = {
                    day: entry.day,
                    plugins: [],
                    features: []
                };
                
                // Collect plugin information from totals_by_ide
                if (entry.totals_by_ide && Array.isArray(entry.totals_by_ide)) {
                    entry.totals_by_ide.forEach(ideData => {
                        if (ideData.last_known_plugin_version) {
                            const ide = ideData.ide || 'unknown';
                            const plugin = ideData.last_known_plugin_version.plugin || 'unknown';
                            const version = ideData.last_known_plugin_version.plugin_version || 'unknown';                            
                            dayData.plugins.push(`${ide}:${plugin}:${version}`);
                        }
                    });
                }
                
                // Collect feature information from totals_by_feature
                if (entry.totals_by_feature && Array.isArray(entry.totals_by_feature)) {
                    entry.totals_by_feature.forEach(featureData => {
                        if (featureData.feature) {
                            dayData.features.push(featureData.feature);
                        }
                    });
                }

                userData.push(dayData);
            }
        } catch (error) {
            console.error('Error parsing line:', error.message);
        }
    }
    
    // Sort by date descending
    userData.sort((a, b) => new Date(b.day) - new Date(a.day));

    // Print CSV header
    console.log('day,plugins,features');
    
    // Print CSV data
    userData.forEach(dayData => {
        const day = dayData.day;
        const plugins = dayData.plugins.join(';');
        const features = dayData.features.join(';');
        console.log(`${day},"${plugins}","${features}"`);
    });

    console.error(`\nFound ${userData.length} entries for user "${username}"`);
}

// Run the script
main();
