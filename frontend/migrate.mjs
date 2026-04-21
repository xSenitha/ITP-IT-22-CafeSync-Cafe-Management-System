import fs from 'fs/promises';
import { statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

const classMap = {
    'btn-primary': 'bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2',
    'btn-cancel': 'bg-transparent border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2',
    'form-input': 'w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all',
    'gradient-text': 'bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text text-transparent',
    'glass-effect': 'bg-white/90 backdrop-blur-md border border-white border-t border-l shadow-xl',
    'empty-state': 'flex flex-col items-center justify-center p-10 text-center bg-white rounded-2xl border-2 border-dashed border-amber-200 my-8',
    'empty-state-icon': 'text-5xl text-amber-500 mb-4',
    'empty-state-title': 'text-xl font-bold text-gray-800 mb-2',
    'empty-state-desc': 'text-sm text-gray-500 max-w-sm',
    'hover-scale': 'hover:scale-\\[1\\.02\\] transition-transform duration-200',
    'app-container': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    'spacing-8': 'gap-2 mb-2',
    'spacing-16': 'gap-4 mb-4',
    'spacing-24': 'gap-6 mb-6',
    'spacing-32': 'gap-8 mb-8',
    'spacing-40': 'gap-10 mb-10',
    'text-primary': 'text-amber-900',
    'text-secondary': 'text-amber-600',
    'bg-primary': 'bg-amber-900',
    'bg-secondary': 'bg-amber-600',
    'bg-cream': 'bg-amber-50',
    'bg-warm': 'bg-orange-50'
};

const iconMap = {
    'FiShoppingCart': 'FaShoppingCart',
    'FiDollarSign': 'FaDollarSign',
    'FiBookOpen': 'FaBookOpen',
    'FiCalendar': 'FaCalendarAlt',
    'FiArrowRight': 'FaArrowRight',
    'FiCheck': 'FaCheck',
    'FiTrendingUp': 'FaChartLine',
    'FiPlus': 'FaPlus',
    'FiClock': 'FaClock',
    'FiUser': 'FaUser',
    'FiMail': 'FaEnvelope',
    'FiLock': 'FaLock',
    'FiPhone': 'FaPhone',
    'FiUserPlus': 'FaUserPlus',
    'FiCoffee': 'FaCoffee',
    'FiEye': 'FaEye',
    'FiEyeOff': 'FaEyeSlash',
    'FiEdit': 'FaEdit',
    'FiTrash2': 'FaTrash',
    'FiSearch': 'FaSearch',
    'FiX': 'FaTimes',
    'FiGrid': 'FaTh',
    'FiUsers': 'FaUsers',
    'FiPackage': 'FaBox',
    'FiFilter': 'FaFilter',
    'FiAlertTriangle': 'FaExclamationTriangle',
    'FiLogOut': 'FaSignOutAlt',
    'FiSettings': 'FaCog',
    'FiChevronDown': 'FaChevronDown',
    'FiMapPin': 'FaMapMarkerAlt',
    'FiFileText': 'FaFileAlt',
    'FiCheckCircle': 'FaCheckCircle'
};

async function processDirectory(dir) {
    const files = await fs.readdir(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (statSync(fullPath).isDirectory()) {
            await processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            await processFile(fullPath);
        }
    }
}

async function processFile(filePath) {
    try {
        let content = await fs.readFile(filePath, 'utf8');
        let original = content;

        // Replace classes
        for (const [oldClass, newClass] of Object.entries(classMap)) {
            // we escape the [] in oldClass if any
            const safeOldClass = oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${safeOldClass}\\b`, 'g');
            content = content.replace(regex, newClass);
        }

        // Replace react-icons/fi import and usage
        const fiImportRegex = /import\s+{([^}]+)}\s+from\s+['"]react-icons\/fi['"];/g;
        let match;

        while ((match = fiImportRegex.exec(content)) !== null) {
            const icons = match[1].split(',').map(i => i.trim()).filter(Boolean);
            const newIcons = icons.map(i => iconMap[i] || i.replace(/^Fi(\w+)/, (_, p1) => `Fa${p1}`));

            // Generate the new import string
            const newImport = `import { ${[...new Set(newIcons)].join(', ')} } from 'react-icons/fa';`;

            // Replace the import statement
            content = content.substring(0, match.index) + newImport + content.substring(match.index + match[0].length);
            // Adjust the regex index since we just modified the string
            fiImportRegex.lastIndex = match.index + newImport.length;

            // Replace usages
            icons.forEach((oldIcon, index) => {
                const newIcon = newIcons[index];
                // Replace component tags
                const tagRegex = new RegExp(`<${oldIcon}(\\s|>)`, 'g');
                content = content.replace(tagRegex, `<${newIcon}$1`);

                // Replace any other word boundaries (e.g. references)
                const wordRegex = new RegExp(`\\b${oldIcon}\\b`, 'g');
                content = content.replace(wordRegex, newIcon);
            });
        }

        if (content !== original) {
            await fs.writeFile(filePath, content, 'utf8');
            console.log(`Updated: ${filePath}`);
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}

processDirectory(srcDir).then(() => console.log('Migration complete.')).catch(console.error);
