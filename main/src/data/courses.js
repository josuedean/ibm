/**
 * Course data models
 * Contains metadata for all course offerings
 */

export const courses = {
  'digital-literacy': {
    id: 'digital-literacy',
    title: 'Digital Literacy',
    description: 'Develop essential skills for navigating the digital landscape, from basic computing concepts to online safety and emerging technologies.',
    color: 'theme-digital-literacy',
    imageAlt: 'Digital Literacy course featuring computer and digital devices',
    sections: {
      overview: 'This course introduces students to fundamental concepts in computing, internet safety, information literacy, and digital tools.',
      resources: [
        { title: 'Digital Literacy Foundations', url: 'https://example.com/digital-foundations' },
        { title: 'Online Safety Guide', url: 'https://example.com/online-safety' },
        { title: 'Information Verification Toolkit', url: 'https://example.com/info-verification' },
        { title: 'Digital Citizenship Resources', url: 'https://example.com/digital-citizenship' }
      ],
      assignments: [
        { title: 'Digital Identity Project', dueDate: '2025-06-20', description: 'Create a presentation about online identity and digital footprints.' },
        { title: 'Information Evaluation Exercise', dueDate: '2025-07-05', description: 'Analyze and evaluate various online information sources.' },
        { title: 'Digital Tool Demonstration', dueDate: '2025-07-15', description: 'Demonstrate proficiency with a chosen digital tool.' },
        { title: 'Final Portfolio', dueDate: '2025-07-30', description: 'Compile your digital literacy artifacts into an online portfolio.' }
      ]
    }
  },
  'accounting': {
    id: 'accounting',
    title: 'Accounting',
    description: 'Master the principles of financial accounting, from basic bookkeeping to advanced financial statement analysis.',
    color: 'theme-accounting',
    imageAlt: 'Accounting course with ledgers and financial statements',
    sections: {
      overview: 'This course covers fundamental accounting concepts, financial statements, bookkeeping procedures, and financial analysis techniques.',
      resources: [
        { title: 'Accounting Principles Handbook', url: 'https://example.com/accounting-principles' },
        { title: 'Financial Statement Templates', url: 'https://example.com/financial-templates' },
        { title: 'Interactive Journal Entry Tool', url: 'https://example.com/journal-entries' },
        { title: 'Accounting Standards Reference', url: 'https://example.com/accounting-standards' }
      ],
      assignments: [
        { title: 'Chart of Accounts Setup', dueDate: '2025-06-18', description: 'Create a chart of accounts for a hypothetical business.' },
        { title: 'Journal Entry Practice', dueDate: '2025-07-02', description: 'Record journal entries for a month of business transactions.' },
        { title: 'Financial Statement Preparation', dueDate: '2025-07-16', description: 'Prepare income statement, balance sheet, and cash flow statement.' },
        { title: 'Financial Analysis Project', dueDate: '2025-07-28', description: 'Analyze a public company\'s financial statements and present findings.' }
      ]
    }
  },
  'data-analysis': {
    id: 'data-analysis',
    title: 'Data Analysis',
    description: 'Learn to transform raw data into actionable insights using statistical methods, visualization techniques, and analytical tools.',
    color: 'theme-data-analysis',
    imageAlt: 'Data Analysis course featuring charts and data visualizations',
    sections: {
      overview: 'This course explores data collection, statistical analysis, data visualization, and interpreting analytical results to drive decision-making.',
      resources: [
        { title: 'Statistical Methods Guide', url: 'https://example.com/statistical-methods' },
        { title: 'Data Visualization Best Practices', url: 'https://example.com/data-visualization' },
        { title: 'Sample Datasets Collection', url: 'https://example.com/sample-datasets' },
        { title: 'Analysis Tools Tutorial', url: 'https://example.com/analysis-tools' }
      ],
      assignments: [
        { title: 'Data Cleaning Exercise', dueDate: '2025-06-19', description: 'Clean and prepare a messy dataset for analysis.' },
        { title: 'Exploratory Data Analysis', dueDate: '2025-07-03', description: 'Conduct EDA on a provided dataset and summarize findings.' },
        { title: 'Statistical Testing Assignment', dueDate: '2025-07-17', description: 'Apply appropriate statistical tests to test hypotheses.' },
        { title: 'Data Story Project', dueDate: '2025-07-29', description: 'Create a comprehensive data story with visualizations and insights.' }
      ]
    }
  },
  'intro-programming': {
    id: 'intro-programming',
    title: 'Intro to Programming',
    description: 'Begin your programming journey with fundamental concepts, problem-solving techniques, and hands-on coding experience.',
    color: 'theme-intro-programming',
    imageAlt: 'Programming course with code examples and algorithms',
    sections: {
      overview: 'This introductory course covers programming fundamentals, logical thinking, algorithm development, and basic software development practices.',
      resources: [
        { title: 'Programming Language Documentation', url: 'https://example.com/programming-docs' },
        { title: 'Coding Practice Exercises', url: 'https://example.com/coding-practice' },
        { title: 'Algorithm Design Guide', url: 'https://example.com/algorithm-design' },
        { title: 'Development Environment Setup', url: 'https://example.com/dev-setup' }
      ],
      assignments: [
        { title: 'First Program Exercise', dueDate: '2025-06-17', description: 'Write your first program with variables and basic operations.' },
        { title: 'Control Structures Challenge', dueDate: '2025-07-01', description: 'Implement various control structures to solve problems.' },
        { title: 'Function Development Task', dueDate: '2025-07-15', description: 'Create reusable functions to perform specific tasks.' },
        { title: 'Mini Application Project', dueDate: '2025-07-27', description: 'Develop a small application that demonstrates programming concepts.' }
      ]
    }
  },
  'global-logistics': {
    id: 'global-logistics',
    title: 'Global Logistics',
    description: 'Explore the complex systems of global supply chain management, transportation networks, and international trade logistics.',
    color: 'theme-global-logistics',
    imageAlt: 'Global Logistics course with supply chain and shipping imagery',
    sections: {
      overview: 'This course examines global supply chains, international transportation, trade regulations, and logistics optimization strategies.',
      resources: [
        { title: 'Global Supply Chain Overview', url: 'https://example.com/global-supply' },
        { title: 'International Shipping Regulations', url: 'https://example.com/shipping-regs' },
        { title: 'Logistics Technology Trends', url: 'https://example.com/logistics-tech' },
        { title: 'Case Studies in Global Trade', url: 'https://example.com/trade-cases' }
      ],
      assignments: [
        { title: 'Supply Chain Mapping', dueDate: '2025-06-22', description: 'Map the complete supply chain for a selected product.' },
        { title: 'Transportation Mode Analysis', dueDate: '2025-07-06', description: 'Compare transportation modes for international shipping scenarios.' },
        { title: 'Logistics Optimization Exercise', dueDate: '2025-07-20', description: 'Optimize a distribution network for cost and efficiency.' },
        { title: 'Global Trade Strategy Project', dueDate: '2025-07-31', description: 'Develop a logistics strategy for a company entering a new global market.' }
      ]
    }
  }
};

/**
 * Get all courses
 * @returns {Array} Array of course objects
 */
export const getAllCourses = () => Object.values(courses);

/**
 * Get a specific course by ID
 * @param {string} id - Course ID
 * @returns {Object|null} Course object or null if not found
 */
export const getCourseById = (id) => courses[id] || null;
