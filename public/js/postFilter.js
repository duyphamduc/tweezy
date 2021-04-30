function postFilter(character, route){
	var posts = document.getElementsByName("postContent");
	var post;
	for (var i = 0; i < posts.length; ++i) {
		post = posts[i].innerHTML;

		var startIndex = 0, index;
		var newPost = post;
		while ((index = post.indexOf(character, startIndex)) > -1) {
			indexOfSpace = post.indexOf(" ", index + 1);
			if (indexOfSpace == -1) {
				indexOfSpace = post.length;
			}
			var textSubstring = post.substring(index, indexOfSpace);
			newPost = newPost.replace(textSubstring, "<a href=\"" + route + post.substring(index + 1, indexOfSpace) + "\">" + textSubstring + "</a>");
			startIndex = index + 1;
		}
		posts[i].innerHTML = newPost;
	}
}

window.onload = function () {
	postFilter('#', "/hashtag/");
	postFilter('@', "/user/");
};