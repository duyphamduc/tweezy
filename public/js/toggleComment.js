function toggleComment(postId) {
    var commentBox = document.getElementById(postId);
    if (commentBox.classList.contains('is-hidden')) {
        commentBox.classList.remove('is-hidden');
    } else {
        commentBox.classList.add('is-hidden');
    }
}