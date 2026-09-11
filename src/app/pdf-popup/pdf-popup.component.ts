import {
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
  SimpleChanges,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import 'pdfjs-dist/build/pdf.worker.entry';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';

@Component({
  selector: 'app-pdf-popup',
  templateUrl: './pdf-popup.component.html',
  styleUrls: ['./pdf-popup.component.css']
})
export class PdfPopupComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() pdfSrc!: any;
  @Input() visible = false;
  @Input() paragraphToHighlight!: string;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('pagesContainer', { static: false }) pdfContainer!: ElementRef<HTMLDivElement>;
  destroyed = false;

  wordToFind = `in greek mythology, talos was a creature made of bronze who acted as guardian for the island of crete. he would throw boulders at the ships of invaders and would complete 3 circuits around the island's perimeter daily. [4]   according to pseudo-apollodorus'   bibliotheke , hephaestus forged talos with the aid of a cyclops and presented the automaton as a gift to minos. [5]   in the argonautica, jason and the argonauts defeated talos by removing a plug near his foot, causing the vital ichor to flow out from his body and rendering him lifeless. [6]`
  pdfDocument: any;
  pageHeights: number[] = [];
  ngOnChanges(changes: SimpleChanges): void {
    if (this.visible && this.pdfSrc) {
      setTimeout(() => this.loadPdf(this.pdfSrc), 0);
    } else if (!this.visible) {
      this.clearPages();
    }
  }

  ngAfterViewInit(): void {
    if (this.visible && this.pdfSrc) {
      this.loadPdf(this.pdfSrc);
      setTimeout(() => {
      this.findAndScroll()
      },2000)
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearPages();
  }

  private clearPages(): void {
    if (this.pdfContainer?.nativeElement) {
      this.pdfContainer.nativeElement.innerHTML = '';
    }
  }

  // async loadPdf(src: string) {
  //   if (!this.pdfContainer) return;

  //   const container = this.pdfContainer.nativeElement;
  //   container.innerHTML = ''; // Clear previous PDF

  //   try {
  //     const loadingTask = pdfjsLib.getDocument(src);
  //     const pdf = await loadingTask.promise;

  //     for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
  //       const page = await pdf.getPage(pageNum);
  //       const viewport = page.getViewport({ scale: 1.5 });

  //       const pageDiv = document.createElement('div');
  //       pageDiv.style.position = 'relative';
  //       pageDiv.style.marginBottom = '10px';
  //       pageDiv.style.width = `${viewport.width}px`;

  //       const canvas = document.createElement('canvas');
  //       const ctx = canvas.getContext('2d')!;
  //       canvas.height = viewport.height;
  //       canvas.width = viewport.width;
  //       pageDiv.appendChild(canvas);

  //       const overlay = document.createElement('div');
  //       overlay.className = 'highlight-overlay';
  //       overlay.style.position = 'absolute';
  //       overlay.style.top = '0';
  //       overlay.style.left = '0';
  //       overlay.style.width = `${viewport.width}px`;
  //       overlay.style.height = `${viewport.height}px`;
  //       pageDiv.appendChild(overlay);

  //       container.appendChild(pageDiv);

  //       await page.render({ canvasContext: ctx, viewport }).promise;

  //       if (this.paragraphToHighlight) {
  //         await this.highlightParagraph(this.paragraphToHighlight, page, viewport, overlay);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error loading PDF:', error);
  //   }
  // }

  // async highlightParagraph(word: string, page: any, viewport: any, overlay: HTMLElement) {
  //   if (!word?.trim()) return;
  
  //   const textContent = await page.getTextContent();
  //   const items = textContent.items;
  
  //   // Logic to group text items into paragraphs
  //   const paragraphs = [];
  //   let currentParagraph: any[] = [];
    
  //   if (items.length === 0) {
  //     return;
  //   }

  //   currentParagraph.push(items[0]);
  //   for (let i = 1; i < items.length; i++) {
  //     const prevItem = items[i - 1];
  //     const currentItem = items[i];
      
  //     const prevY = prevItem.transform[5];
  //     const currentY = currentItem.transform[5];
  //     const prevItemHeight = Math.abs(prevItem.transform[3]);

  //     if (Math.abs(currentY - prevY) > prevItemHeight * 1.5) {
  //       paragraphs.push(currentParagraph);
  //       currentParagraph = [];
  //     }
  //     currentParagraph.push(currentItem);
  //   }
  //   if (currentParagraph.length > 0) {
  //     paragraphs.push(currentParagraph);
  //   }
  
  //   let  target = word.trim().toLowerCase();

  //   target = `in greek mythology, talos was a creature made of bronze who acted as guardian for the island of crete. he would throw boulders at the ships of invaders and would complete 3 circuits around the island's perimeter daily. [4]   according to pseudo-apollodorus'   bibliotheke , hephaestus forged talos with the aid of a cyclops and presented the automaton as a gift to minos. [5]   in the argonautica, jason and the argonauts defeated talos by removing a plug near his foot, causing the vital ichor to flow out from his body and rendering him lifeless. [6]`
  
  //   // Iterate through the grouped paragraphs and highlight
  //   paragraphs.forEach((paragraphItems: any[]) => {
  //     const paragraphText = paragraphItems.map(item => item.str).join(' ').toLowerCase();
      
  //     console.log(`Checking paragraph: ${paragraphText}`);
  //     if (paragraphText.includes(target)) {
  //       // Find the bounding box for each word within the matching paragraph
  //       paragraphItems.forEach(item => {
  //         const itemText = item.str.toLowerCase();
  //         console.log(`Checking itemText: ${itemText}`);
  //         if (itemText.includes(target) || target.includes(itemText)) {
  //           console.log(`sicess`);
  //           // Transform the coordinates for each word
  //           const tm = pdfjsLib.Util.transform(viewport.transform, item.transform);
  //           const x = tm[4];
  //           const y = tm[5];
  //           const totalWidth = (item.width || 0) * viewport.scale;
  //           const fontHeight = Math.max(Math.hypot(tm[2], tm[3]), 1);

  //           // Create and position the highlight rectangle for the word
  //           const mark = document.createElement('div');
  //           mark.className = 'highlight-word';
  //           mark.style.left = `${x}px`;
  //           mark.style.top = `${viewport.height - y - fontHeight}px`;
  //           mark.style.width = `${totalWidth}px`;
  //           mark.style.height = `${fontHeight}px`;
  //           overlay.appendChild(mark);
  //         }
  //       });
  //     }
  //   });
  // }
  

  async loadPdf(src: string) {
    if (!this.pdfContainer) return;

    const container = this.pdfContainer.nativeElement;
    container.innerHTML = ''; // Clear previous PDF
    this.pageHeights = []; // Reset page heights

    try {
      const loadingTask = pdfjsLib.getDocument(src);
      this.pdfDocument = await loadingTask.promise;

      for (let pageNum = 1; pageNum <= this.pdfDocument.numPages; pageNum++) {
        const page = await this.pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page-wrapper';
        pageDiv.style.width = `${viewport.width}px`;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        pageDiv.appendChild(canvas);
        container.appendChild(pageDiv);

        this.pageHeights.push(viewport.height); // Store the height for later scrolling

        await page.render({ canvasContext: ctx, viewport }).promise;

       
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  }

  async findAndScroll() {
    if (!this.paragraphToHighlight || !this.pdfDocument) return;

    const target = this.paragraphToHighlight.trim().toLowerCase();
    console.log(`Searching for: "${target}" in the PDF...`);
    for (let pageNum = 1; pageNum <= this.pdfDocument.numPages; pageNum++) {
      const page = await this.pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ').toLowerCase();

      console.log(`Checking page ${pageNum}: ${pageText}`);
      if (isHalfMatching(pageText, target) || isHalfMatching(target, pageText)) {
        console.log(`Found "${this.paragraphToHighlight}" on page ${pageNum}. Scrolling...`);
        let scrollPosition = 0;
        // Sum up the heights of all previous pages to get the scroll offset
        for (let i = 0; i < pageNum - 1; i++) {
            scrollPosition += this.pageHeights[i] + 10; // 10 is the margin-bottom
        }

        this.pdfContainer.nativeElement.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
        
        // Break the loop once the page is found
        break;
      }
    }

function isHalfMatching(a: string, b: string): boolean {
  // A helper function to process a string into a set of unique words.
  const getUniqueWords = (text: string): Set<string> => {
    // Remove citation numbers like [4], and convert to lowercase to ensure a case-insensitive comparison.
    const cleanedText = text.replace(/\[\d+\]/g, "").toLowerCase();
    // Split the text into words using a regular expression that handles various whitespace and punctuation.
    const words = cleanedText.match(/\b\w+\b/g) || [];
    return new Set(words);
  };

  const wordsA = getUniqueWords(a);
  const wordsB = getUniqueWords(b);

  let commonWordCount = 0;
  // Iterate over the unique words of string `a` and check for their presence in string `b`.
  wordsA.forEach(word => {
    if (wordsB.has(word)) {
      commonWordCount++;
    }
  });

  // Calculate the percentage of common words based on the number of unique words in `a`.
  // The condition is met if this percentage is greater than 50%.
  const percentage = (commonWordCount / wordsA.size) * 100;
  return percentage > 50;
}

// Provided strings from the user's previous request.
const stringA = `in 1955, allen newell and future nobel laureate herbert a. simon created the 'logic theorist', with help from j. c. shaw. the program would eventually prove 38 of the first 52 theorems in russell and whitehead's principia mathematica, and find new and more elegant proofs for some.[78] simon said that they had 'solved the venerable mind/body problem, explaining how a system composed of matter can have the properties of mind.'[79][c] the symbolic reasoning paradigm they introduced would dominate ai research and funding until the middle 90s, as well as inspire the cognitive revolution.`;

const stringB = `hebb began formulating the foundational ideas for this book in the early 1940s, particularly during his time at the yerkes laboratories of primate biology from 1942 to 1947. he made extensive notes between june 1944 and march 1945 and sent a complete draft to his mentor karl lashley in 1946. the manuscript for the organization of behavior wasn’t published until 1949. the delay was due to various factors, including world war ii and shifts in academic focus. by the time it was published, several of his peers had already published related ideas, making hebb’s work seem less groundbreaking at first glance. however, his synthesis of psychological and neurophysiological principles became a cornerstone of neuroscience and machine learning.   [67]   [68]  walter pitts and warren mcculloch analyzed networks of idealized artificial neurons and showed how they might perform simple logical functions in 1943. they were the first to describe what later researchers would call a neural network. [69]   the paper was influenced by turing's paper 'on computable numbers' from 1936 using similar two-state boolean 'neurons', but was the first to apply it to neuronal function. [60]   one of the students inspired by pitts and mcculloch was marvin minsky who was a 24- year-old graduate student at the time. in 1951 minsky and dean edmonds built the first neural net machine, the snarc. [70]   minsky would later become one of the most important leaders and innovators in ai. experimental robots such as w. grey walter's turtles and the johns hopkins beast, were built in the 1950s. these machines did not use computers, digital electronics or symbolic reasoning; they were controlled entirely by analog circuitry. [71]  in 1951, using the ferranti mark 1 machine of the university of manchester, christopher strachey wrote a checkers program [72]   and dietrich prinz wrote one for chess. [73]   arthur samuel's checkers program, the subject of his 1959 paper "some studies in machine learning using the game of checkers", eventually achieved sufficient skill to challenge a respectable amateur. [74]   samuel's program was among the first uses of what would later be called machine learning. [75]   game ai would continue to be used as a measure of progress in ai throughout its history. when access to digital computers became possible in the mid-fifties, a few scientists instinctively recognized that a machine that could manipulate numbers could also manipulate symbols and that the manipulation of symbols could well be the essence of human thought. this was a new approach to creating thinking machines. [76][77]  in 1955, allen newell and future nobel laureate herbert a. simon created the "logic theorist", with help from j. c. shaw. the program would eventually prove 38 of the first 52 theorems in russell and whitehead's   principia mathematica , and find new and more elegant proofs for some. [78]   simon said that  artificial neural networks cybernetic robots game ai symbolic reasoning and the logic theorist`;

// Call the function and log the result to the console.
const result = isHalfMatching(stringA, stringB);
const result2 = isHalfMatching(stringB, stringA);
console.log(result,result2,280); // This will output 'true'
  }
  close() {
    this.closed.emit();
    this.visible = false;
  }
}
