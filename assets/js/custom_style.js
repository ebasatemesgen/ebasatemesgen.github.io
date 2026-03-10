

function createShootingStar() {
    const container = document.querySelector('#experience .shooting-stars-container');
    if (!container) {
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) {
        return;
    }

    // Create a new shooting star element
    const star = document.createElement('div');
    star.classList.add('shooting-star');

    // Randomize the starting position
    const startX = Math.random() * width;
    const startY = Math.random() * (height * 0.45);

    // Set initial position
    star.style.left = `${startX}px`;
    star.style.top = `${startY}px`;

    // Randomize duration
    const duration = Math.random() * 2 + 2; // Between 2s and 4s
    star.style.animationDuration = `${duration}s`;

    // Append the star to the container
    container.appendChild(star);

    // Remove the star after animation ends
    setTimeout(() => {
        star.remove();
    }, duration * 1000); // Match animation duration
}

const starsContainer = document.querySelector('#experience .shooting-stars-container');
if (starsContainer) {
    // Generate stars at random intervals only inside Experience section
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance per interval
            createShootingStar();
        }
    }, 3000); // Every 3 seconds
}



function copyCitation() {
    const citationText = document.getElementById("citationText").innerText;
    const copyButton = document.getElementById("copyButton");

    navigator.clipboard.writeText(citationText).then(() => {
        copyButton.classList.replace("fa-copy", "fa-check"); // Change icon to a checkmark
        copyButton.title = "Copied!";
        setTimeout(() => {
            copyButton.classList.replace("fa-check", "fa-copy"); // Revert icon to copy after 2 seconds
            copyButton.title = "Copy Citation";
        }, 2000);
    }).catch(err => {
        copyButton.classList.replace("fa-copy", "fa-times"); // Change icon to an error icon
        copyButton.title = "Error!";
        setTimeout(() => {
            copyButton.classList.replace("fa-times", "fa-copy"); // Revert icon to copy after 2 seconds
            copyButton.title = "Copy Citation";
        }, 2000);
    });
}



