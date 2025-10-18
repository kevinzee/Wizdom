import { SimplifiedData, UploadedFile } from '../types';

// This is a mock API. In a real application, you would use axios or fetch to make a network request.
export const clarifyDocument = (text: string, language: string, file: UploadedFile | null): Promise<SimplifiedData> => {
  console.log('API called with:', { text, language, file });

  let mockSimplifiedText = `This is a simplified version of your document, translated into the selected language. The original text had ${text.split(' ').length} words. We've made it easier to read by using simpler vocabulary and shorter sentences. This process helps improve clarity and accessibility for a wider audience.`;

  if (file) {
     let fileTypeInfo = '';
     if (file.type === 'image') {
       fileTypeInfo = `The provided image, '${file.name}', has also been analyzed.`;
     } else if (file.name.endsWith('.pdf')) {
       fileTypeInfo = `The provided PDF document, '${file.name}', has also been analyzed.`;
     } else {
       fileTypeInfo = `The provided document, '${file.name}', has also been analyzed.`;
     }
    mockSimplifiedText = `This is a simplified version of your content from the file '${file.name}'. We've made it easier to read and translated it into the selected language. ${fileTypeInfo}`;
  }


  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (text.toLowerCase().includes('error')) {
        reject(new Error('Failed to process the document due to an error keyword.'));
      } else {
        resolve({
          simplifiedText: mockSimplifiedText,
          // Using a placeholder audio file
          audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        });
      }
    }, 1500); // Simulate network delay
  });
};