document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');

    canvas.addEventListener('dblclick', (event) => {
        const note = document.createElement('div');
        note.className = 'note';
        note.contentEditable = true;
        note.style.left = `${event.clientX}px`;
        note.style.top = `${event.clientY}px`;
        canvas.appendChild(note);

        note.addEventListener('mousedown', (event) => {
            let shiftX = event.clientX - note.getBoundingClientRect().left;
            let shiftY = event.clientY - note.getBoundingClientRect().top;

            function moveAt(pageX, pageY) {
                note.style.left = pageX - shiftX + 'px';
                note.style.top = pageY - shiftY + 'px';
            }

            function onMouseMove(event) {
                moveAt(event.pageX, event.pageY);
            }

            document.addEventListener('mousemove', onMouseMove);

            note.onmouseup = () => {
                document.removeEventListener('mousemove', onMouseMove);
                note.onmouseup = null;
            };
        });

        note.ondragstart = () => {
            return false;
        };

        note.addEventListener('blur', () => {
            note.removeAttribute('contenteditable');
        });

        note.addEventListener('dblclick', () => {
            note.contentEditable = true;
            note.focus();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Delete') {
            const activeElement = document.activeElement;
            if (activeElement.classList.contains('note')) {
                activeElement.remove();
            }
        }
    });
});
