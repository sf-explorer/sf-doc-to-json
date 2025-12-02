# Salesforce Object Explorer

A React-based application for exploring Salesforce objects with metadata-driven insights. This application uses the Salesforce Lightning Design System (SLDS) for visual styling and Material UI React Table for an enhanced user experience.

## Features

- 🔍 **Browse Objects**: View all standard and custom Salesforce objects
- 📊 **Object Metadata**: Display object labels, API names, key prefixes, and field counts
- 📋 **Field Details**: Explore field metadata including types, lengths, required status, and more
- 🎨 **SLDS Styling**: Uses Salesforce Lightning Design System for authentic Salesforce look and feel
- 🎯 **Icon Categories**: Each object displays with the correct Salesforce icon category
- 🔎 **Search & Filter**: Quickly find objects and fields using built-in search functionality
- 📱 **Responsive Design**: Works seamlessly across different screen sizes

## Technology Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **@sf-explorer/salesforce-object-reference@1.0.1** - Salesforce object metadata package
- **@salesforce-ux/design-system** - Official Salesforce Lightning Design System
- **Material UI React Table** - Enhanced table component with sorting, filtering, and pagination
- **Material UI** - Component library for enhanced UX

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:3000`)

## Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── ObjectExplorer.jsx    # Main container component
│   ├── ObjectList.jsx         # Object list with Material UI React Table
│   ├── FieldDetail.jsx        # Field details display
│   └── SalesforceIcon.jsx     # Icon component for objects
├── App.jsx                     # Root application component
├── App.css                     # Application styles
├── main.jsx                    # Application entry point
└── index.css                   # Global styles with SLDS import
```

## Usage

1. **Browse Objects**: The left panel displays all available Salesforce objects with search and filtering capabilities
2. **Select an Object**: Click on any object row to view its detailed information
3. **View Fields**: The right panel shows all fields for the selected object with their metadata
4. **Search**: Use the search boxes to quickly find specific objects or fields
5. **Sort & Filter**: Click column headers to sort, and use the filter icon to filter data

## Features in Detail

### Object List
- Displays object icon, label, API name, type (standard/custom), and field count
- Sortable columns
- Global search across all columns
- Pagination with configurable page size
- Click-to-select functionality

### Field Details
- Shows comprehensive field metadata
- Displays field type, length, required status, unique status, and external ID status
- Expandable rows for additional field information (descriptions, picklist values)
- Reference field relationships
- Color-coded chips for quick visual identification

### Icons
- Automatic icon selection based on object type
- Custom objects display with purple color scheme
- Standard objects use appropriate Salesforce color schemes
- Icon displays object initials for quick recognition

## Package Information

This application uses the `@sf-explorer/salesforce-object-reference@1.0.1` package which provides:
- Metadata for standard Salesforce objects
- Field definitions and properties
- Object relationships
- Picklist values
- And more...

## License

MIT

