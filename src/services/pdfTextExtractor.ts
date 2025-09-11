// Alternative PDF text extraction using multiple methods

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('Starting PDF text extraction for:', file.name);
    
    // Method 1: Try advanced stream decoding
    const text1 = await advancedStreamExtraction(file);
    if (text1.length > 50 && !text1.includes('reportlab') && /[a-zA-Z\s]{10,}/.test(text1)) {
      console.log('Advanced extraction succeeded, length:', text1.length);
      return text1;
    }

    // Method 2: Try basic PDF extraction
    const text2 = await basicPDFExtraction(file);
    if (text2.length > 50 && !text2.includes('reportlab') && /[a-zA-Z\s]{10,}/.test(text2)) {
      console.log('Basic extraction succeeded, length:', text2.length);
      return text2;
    }

    // Method 3: Try regex-based extraction
    const text3 = await regexPDFExtraction(file);
    if (text3.length > 50 && !text3.includes('reportlab') && /[a-zA-Z\s]{10,}/.test(text3)) {
      console.log('Regex extraction succeeded, length:', text3.length);
      return text3;
    }

    // Method 4: Try raw text extraction (for simple PDFs)
    const text4 = await rawTextExtraction(file);
    if (text4.length > 50 && !text4.includes('reportlab') && /[a-zA-Z\s]{10,}/.test(text4)) {
      console.log('Raw extraction succeeded, length:', text4.length);
      return text4;
    }

    // Method 5: If all else fails, return a message indicating the PDF needs manual processing
    console.warn('All extraction methods failed, creating manual entry prompt');
    return createManualEntryPrompt(file.name);

  } catch (error) {
    console.error('Error in PDF text extraction:', error);
    return createManualEntryPrompt(file.name);
  }
}

function createManualEntryPrompt(fileName: string): string {
  return `This PDF file (${fileName}) contains content that requires manual processing.

INSTRUCTIONS FOR MANUAL ENTRY:
Please create knowledge base entries manually by:
1. Opening the original PDF file
2. Reading the terms and conditions
3. Creating individual entries for each term/condition
4. Editing the auto-generated template entries below

The system has created template entries that you can edit with the actual content from your PDF.

Common terms to look for and extract:
- Return policies and timeframes
- Shipping information and costs
- Payment terms and conditions
- Warranty and liability information
- Contact and support details
- Usage restrictions
- Refund procedures
- Cancellation policies

Please edit each template entry with the actual content from your PDF document.`;
}

async function basicPDFExtraction(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(arrayBuffer);
  
  console.log('PDF raw text sample:', rawText.substring(0, 500));
  
  let extractedText = '';
  
  // Extract ALL text between parentheses - let AI decide what's relevant
  const textMatches = rawText.match(/\(([^)]+)\)/g);
  if (textMatches) {
    const allText = textMatches
      .map(match => match.slice(1, -1)) // Remove parentheses
      .filter(text => {
        // Very minimal filtering - just remove obvious junk
        return text.length > 2 && 
               /[a-zA-Z]/.test(text) && // Contains at least some letters
               !text.match(/^[<>@#$%^&*()_+=|\\{}\[\]:";'?/.,~`!\-\s]+$/); // Not just symbols
      })
      .join(' ');
    
    extractedText = allText;
  }
  
  console.log('Complete extracted text length:', extractedText.length);
  console.log('Text preview:', extractedText.substring(0, 300));
  
  return cleanText(extractedText);
}

async function regexPDFExtraction(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(arrayBuffer);
  
  console.log('Regex extraction - extracting ALL text patterns...');
  
  let extractedText = '';
  
  // Method 1: Extract ALL text between parentheses with minimal filtering
  const parenthesesMatches = rawText.match(/\(([^)]+)\)/g);
  if (parenthesesMatches) {
    const allText = parenthesesMatches
      .map(match => match.slice(1, -1))
      .filter(text => text.length > 1 && /[a-zA-Z]/.test(text)) // Very minimal filter
      .join(' ');
    extractedText += allText + ' ';
  }
  
  // Method 2: Extract text with Tj commands (PDF text operators)
  const tjMatches = rawText.match(/\(([^)]+)\)\s*Tj/g);
  if (tjMatches) {
    const textFromTj = tjMatches
      .map(match => {
        const textMatch = match.match(/\(([^)]+)\)/);
        return textMatch ? textMatch[1] : '';
      })
      .filter(text => text.length > 1 && /[a-zA-Z]/.test(text)) // Minimal filter
      .join(' ');
    extractedText += textFromTj + ' ';
  }
  
  // Method 3: Extract from streams with all readable content
  const streamMatches = rawText.match(/stream\s*\n([\s\S]*?)\n\s*endstream/g);
  if (streamMatches) {
    for (const streamMatch of streamMatches) {
      const streamContent = streamMatch.replace(/stream\s*\n|\n\s*endstream/g, '');
      
      // Extract ALL text patterns from streams
      const allPatterns = [
        /\(([^)]+)\)/g,  // All text in parentheses
        /\/F\d+\s+\d+\s+Tf[^(]*\(([^)]+)\)/g,  // Font + text
        /BT[^E]*\(([^)]+)\)[^E]*ET/g,  // Between BT/ET commands
        /Td[^(]*\(([^)]+)\)/g,  // Text positioning + text
        /TJ[^(]*\(([^)]+)\)/g   // Text array operations
      ];
      
      for (const pattern of allPatterns) {
        const matches = streamContent.match(pattern);
        if (matches) {
          const text = matches
            .map(match => {
              const textMatch = match.match(/\(([^)]+)\)/);
              return textMatch ? textMatch[1] : '';
            })
            .filter(text => text.length > 1 && /[a-zA-Z]/.test(text))
            .join(' ');
          extractedText += text + ' ';
        }
      }
    }
  }
  
  console.log('Complete extraction length:', extractedText.length);
  console.log('Sample extracted text:', extractedText.substring(0, 500));
  
  return cleanText(extractedText);
}

// Advanced stream extraction method
async function advancedStreamExtraction(file: File): Promise<string> {
  console.log('Trying advanced stream extraction...');
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawText = decoder.decode(arrayBuffer);
  
  let extractedText = '';
  
  // Look for stream objects and try to extract readable content
  const streamMatches = rawText.match(/stream\s*\r?\n([\s\S]*?)\r?\n\s*endstream/g);
  if (streamMatches) {
    console.log('Found', streamMatches.length, 'streams');
    
    for (const streamMatch of streamMatches) {
      let streamContent = streamMatch.replace(/stream\s*\r?\n|\r?\n\s*endstream/g, '');
      
      // Try to find readable text patterns in the stream
      const readablePatterns = [
        // Standard text patterns
        /BT.*?ET/gs,  // Between Begin Text and End Text
        /\(([^)]{3,})\)\s*Tj/g,  // Text show operators
        /\[([^\]]{10,})\]\s*TJ/g,  // Array text operators
        // More aggressive patterns
        /\(([^)]{5,})\)/g,  // Any text in parentheses
        /\b[A-Z][a-z]{2,}\b/g,  // Words starting with capital
      ];
      
      for (const pattern of readablePatterns) {
        const matches = streamContent.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Extract text from parentheses
            const textInParens = match.match(/\(([^)]+)\)/g);
            if (textInParens) {
              const cleanedText = textInParens
                .map(text => text.slice(1, -1))
                .join(' ')
                .replace(/\\[rn]/g, ' ')
                .trim();
              
              if (cleanedText.length > 5 && /[a-zA-Z]{3,}/.test(cleanedText)) {
                extractedText += cleanedText + ' ';
              }
            }
          }
        }
      }
    }
  }
  
  console.log('Advanced extraction found text length:', extractedText.length);
  return cleanText(extractedText);
}

// Raw text extraction for simple PDFs
async function rawTextExtraction(file: File): Promise<string> {
  console.log('Trying raw text extraction...');
  const arrayBuffer = await file.arrayBuffer();
  
  // Try different encodings
  const encodings = ['utf-8', 'latin1', 'ascii'];
  let bestText = '';
  
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: false });
      const rawText = decoder.decode(arrayBuffer);
      
      // Look for readable text sequences
      const readableSequences = rawText.match(/[a-zA-Z\s.,;:!?]{20,}/g);
      if (readableSequences) {
        const combinedText = readableSequences.join(' ');
        if (combinedText.length > bestText.length) {
          bestText = combinedText;
        }
      }
    } catch (error) {
      console.log(`Failed to decode with ${encoding}:`, error);
    }
  }
  
  console.log('Raw extraction found text length:', bestText.length);
  return cleanText(bestText);
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\x20-\x7E\n]/g, '') // Remove non-printable characters except newlines
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
}

export async function estimatePDFPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(arrayBuffer);
    
    // Method 1: Look for /Count in PDF structure
    const countMatches = text.match(/\/Count\s+(\d+)/g);
    if (countMatches && countMatches.length > 0) {
      const counts = countMatches.map(match => {
        const result = match.match(/\/Count\s+(\d+)/);
        return result ? parseInt(result[1]) : 0;
      });
      const maxCount = Math.max(...counts);
      if (maxCount > 0 && maxCount < 10000) { // Reasonable page count
        return maxCount;
      }
    }
    
    // Method 2: Count /Page objects
    const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }
    
    // Method 3: Estimate based on file size
    const sizeBasedEstimate = Math.max(1, Math.round(file.size / 150000)); // ~150KB per page
    return Math.min(sizeBasedEstimate, 500); // Cap at 500 pages
    
  } catch (error) {
    console.error('Error estimating page count:', error);
    return 1;
  }
}