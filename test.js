// index.js

import { main } from './ai.js';

// Define your input
const userInput = "hello!";

// Call the main function with the input
main(userInput)
  .then(() => {
    console.log('Execution complete'); // Optional: log a message after execution
  })
  .catch((error) => {
    console.error('Error:', error); // Log any errors that occur during execution
});
