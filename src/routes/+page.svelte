<script lang="ts">
	import { enhance } from '$app/forms';

	import type { PageData } from './$types';

	export let data: PageData;

	const host = 'https://api.dicebear.com/7.x/bottts-neutral/svg';
	const bgs = ['BF616A', 'D08770', 'EBCB8B', 'A3BE8C', 'B48EAD', '88C0D0', '81A1C1'];
	const hostUrl = new URL(host);
	bgs.forEach((backgroundColor) => {
		hostUrl.searchParams.append('backgroundColor', backgroundColor);
	});
	const username = data.user.username;
	hostUrl.searchParams.set('seed', username);
	const image = hostUrl.href;
</script>

<h1>Hi, {data.user.username}!</h1>
<img src={image} height="100px" width="100px" alt="profile" />
<p>Email: {data.user.email}</p>
<form method="post" use:enhance>
	<button>Sign out</button>
</form>
