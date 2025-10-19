import React, { useState, useRef, useEffect } from 'react';
import { extractFormFields, populateForm, downloadPDF } from '../services/api';
import { SmallSpinnerIcon } from './icons/Icons';
import { LANGUAGES } from '../constants';
import { useLocalization } from '../context/LocalizationContext';

interface FormField {
  name: string;
  type: string;
  value: string;
}

interface TranslatedFormField extends FormField {
  displayName: string;
}

interface FormFillerProps {
  theme: 'light' | 'dark';
}

export const FormFiller: React.FC<FormFillerProps> = ({ theme }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formFields, setFormFields] = useState<TranslatedFormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isTranslatingFields, setIsTranslatingFields] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { language } = useLocalization();

  // Translate field names when language changes
  const translateFieldNames = async (fields: FormField[], targetLanguage: string) => {
    if (targetLanguage === 'en') {
      // No translation needed for English
      return fields.map(field => ({
        ...field,
        displayName: field.name
      }));
    }

    setIsTranslatingFields(true);
    try {
      const languageName = LANGUAGES.find(l => l.code === targetLanguage)?.name || 'English';
      
      // Translate each field name
      const translatedFields = await Promise.all(
        fields.map(async (field) => {
          try {
            // Import here to avoid circular dependency
            const { getTranslations } = await import('../services/api');
            const translations = await getTranslations(languageName, { field: field.name });
            return {
              ...field,
              displayName: translations.field || field.name
            };
          } catch (err) {
            console.warn(`Failed to translate field "${field.name}":`, err);
            return {
              ...field,
              displayName: field.name
            };
          }
        })
      );
      
      return translatedFields;
    } catch (err) {
      console.error('Failed to translate field names:', err);
      // Fallback: return fields with original names as display names
      return fields.map(field => ({
        ...field,
        displayName: field.name
      }));
    } finally {
      setIsTranslatingFields(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);
    setUploadedFile(file);
    setFormFields([]);
    setFieldValues({});

    try {
      console.log(`Extracting form fields from ${file.name}...`);
      const response = await extractFormFields(file);
      
      if (!response.has_form_fields) {
        setError('This PDF has no form fields to fill.');
        setUploadedFile(null);
        setIsLoading(false);
        return;
      }

      // Translate field names based on selected language
      const translatedFields = await translateFieldNames(response.fields, selectedLanguage);
      setFormFields(translatedFields);
      
      // Initialize field values with original field names as keys
      const initialValues: Record<string, string> = {};
      response.fields.forEach((field) => {
        initialValues[field.name] = '';
      });
      setFieldValues(initialValues);
      setSuccess(`Form loaded successfully! ${response.fields.length} fields found.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract form fields.');
      setUploadedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    
    // Re-translate field names if there are already fields loaded
    if (formFields.length > 0) {
      // Get original field names (they're stored but we need to reconstruct)
      const originalFields = formFields.map(({ displayName, ...field }) => field);
      const translatedFields = await translateFieldNames(originalFields, newLanguage);
      setFormFields(translatedFields);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handlePopulateForm = async () => {
    if (!uploadedFile) {
      setError('No PDF file selected.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Populating form and generating PDF...');
      // fieldValues has original field names as keys
      const pdfBlob = await populateForm(uploadedFile, fieldValues);
      downloadPDF(pdfBlob, `filled_${uploadedFile.name}`);
      setSuccess('PDF generated and downloaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to populate form.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    setUploadedFile(null);
    setFormFields([]);
    setFieldValues({});
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderFormField = (field: TranslatedFormField) => {
    const baseClasses = "w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-purple-500 focus:border-purple-500 transition-colors";

    switch (field.type) {
      case 'checkbox':
        return (
          <label key={field.name} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={fieldValues[field.name] === 'true' || fieldValues[field.name] === '/Yes'}
              onChange={(e) => handleFieldChange(field.name, e.target.checked ? '/Yes' : '')}
              className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.displayName}</span>
          </label>
        );
      case 'radio':
        return (
          <label key={field.name} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <input
              type="radio"
              name={field.name}
              value={field.value}
              checked={fieldValues[field.name] === field.value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-4 h-4 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{field.displayName}: {field.value}</span>
          </label>
        );
      case 'dropdown':
        return (
          <div key={field.name} className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.displayName}</label>
            <select
              value={fieldValues[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={baseClasses}
            >
              <option value="">Select an option</option>
              <option value={field.value}>{field.value}</option>
            </select>
          </div>
        );
      default: // text
        return (
          <div key={field.name} className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.displayName}</label>
            <input
              type="text"
              value={fieldValues[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Enter ${field.displayName}`}
              className={baseClasses}
            />
          </div>
        );
    }
  };

  return (
    <div className={`p-6 max-w-3xl mx-auto rounded-lg ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h2 className="text-3xl font-bold mb-2">Form Filler</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Upload a PDF form, fill in the fields, and download the completed document.</p>

      {/* Language Selector */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Display Language for Form Fields
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isTranslatingFields}
          className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="en">English</option>
          {LANGUAGES.filter(l => l.code !== 'en').map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        {isTranslatingFields && (
          <div className="mt-2 flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
            <SmallSpinnerIcon />
            <span>Translating field names...</span>
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div className={`mb-6 p-4 border-2 border-dashed rounded-lg ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium mb-3">Upload PDF Form</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="hidden"
              aria-label="Upload PDF file"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors"
            >
              {uploadedFile ? `Loaded: ${uploadedFile.name}` : 'Choose PDF File'}
            </button>
            {uploadedFile && (
              <button
                onClick={handleClearForm}
                className="ml-2 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-300 dark:border-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm border border-green-300 dark:border-green-700">
          <strong>Success:</strong> {success}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 flex items-center justify-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <SmallSpinnerIcon />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Processing form...</span>
        </div>
      )}

      {/* Form Fields */}
      {formFields.length > 0 && !isLoading && (
        <div className="space-y-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Fill Form Fields</h3>
            <div className={`p-4 rounded-lg space-y-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
              {formFields.map((field) => renderFormField(field))}
            </div>
          </div>

          {/* Populate Button */}
          <button
            onClick={handlePopulateForm}
            disabled={isLoading}
            className="w-full mt-6 p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
          >
            {isLoading ? 'Generating PDF...' : 'Generate & Download PDF'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {uploadedFile && formFields.length === 0 && !isLoading && !error && (
        <div className={`text-center p-8 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className="text-gray-500 dark:text-gray-400">Waiting for form fields to load...</p>
        </div>
      )}

      {!uploadedFile && formFields.length === 0 && (
        <div className={`text-center p-8 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className="text-gray-500 dark:text-gray-400">Upload a PDF form to get started</p>
        </div>
      )}
    </div>
  );
};