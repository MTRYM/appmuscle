<script>
  import CoachChat from '$lib/components/CoachChat.svelte';
</script>

<svelte:head>
  <title>AppMuscu — Coach IA</title>
</svelte:head>

<div class="coach-page">
  <CoachChat />
</div>

<style>
  .coach-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
