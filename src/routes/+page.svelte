<script lang="ts">
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';

    export let form;
    let userCoords = ""; 
    let locating = false;
    let container: HTMLElement;

    onMount(() => {
        if (navigator.geolocation) {
            locating = true;
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userCoords = `${pos.coords.latitude},${pos.coords.longitude}`;
                    locating = false;
                },
                () => { locating = false; },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    });

    $: if (form?.steps && container) container.scrollTo(0, 0);
    $: steps = form?.steps ?? [];
</script>

<main class="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 overflow-x-hidden">
    {#if steps.length === 0}
        <div class="min-h-screen p-6 flex flex-col justify-center max-w-2xl mx-auto text-center">
            <h1 class="text-6xl md:text-8xl font-black mb-10 tracking-tighter italic text-blue-500">Let's Go</h1>
            
            <form method="POST" action="?/getDirections" use:enhance={() => {
                locating = true;
                return async ({ update }) => { await update(); locating = false; };
            }} class="space-y-6">
                <input type="hidden" name="origin" value={userCoords} />

                <input 
                    name="destination" 
                    placeholder="Where to?" 
                    class="w-full text-2xl md:text-4xl p-6 md:p-10 bg-slate-900 border-[6px] border-slate-800 rounded-[30px] md:rounded-[50px] outline-none focus:border-blue-600 transition-all font-bold text-center"
                    required
                    autocomplete="off"
                />
                
                <button 
                    disabled={locating}
                    class="w-full bg-blue-600 hover:bg-blue-500 text-white text-4xl md:text-6xl p-8 md:p-12 rounded-[30px] md:rounded-[50px] font-black shadow-2xl active:scale-95 transition-all disabled:opacity-50 border-b-[10px] border-blue-800 uppercase">
                    {locating ? 'Searching...' : 'Go Now'}
                </button>

                {#if form?.error}
                    <div class="bg-red-900/30 border-[4px] border-red-600 p-6 rounded-[30px]">
                        <p class="text-red-500 text-xl font-black uppercase">{form.error}</p>
                    </div>
                {/if}
            </form>
        </div>
    {:else}
        <div class="flex flex-col h-screen overflow-hidden">
            <header class="p-4 md:p-6 bg-black border-b-[4px] border-blue-600 flex justify-between items-center shadow-2xl z-20 gap-4">
                <div class="flex-1 min-w-0">
                    <h1 class="text-lg md:text-2xl font-black uppercase truncate text-white leading-tight">
                        {form.destinationName}
                    </h1>
                    <p class="text-lg md:text-2xl font-black text-green-400 uppercase tracking-tighter">
                        {form.eta} TRIP
                    </p>
                </div>
                <button 
                    on:click={() => { form = null; }} 
                    class="bg-red-600 px-6 py-4 rounded-[20px] font-black text-lg md:text-2xl border-b-[6px] border-red-800 shrink-0 active:scale-90 transition-transform">
                    EXIT
                </button>
            </header>

            <div bind:this={container} class="flex-grow overflow-y-auto snap-y snap-mandatory p-4 space-y-8 bg-slate-900 pb-32">
                {#each steps as step, i}
                    <div class="snap-start min-h-[70vh] border-[8px] md:border-[12px] border-white rounded-[40px] md:rounded-[60px] p-8 md:p-12 flex flex-col justify-center bg-slate-950 shadow-2xl">
                        <div class="mb-6">
                            <span class="bg-blue-600 text-white text-xl md:text-3xl px-6 py-2 rounded-full font-black uppercase">
                                Step {i + 1}
                            </span>
                        </div>
                        <h2 class="text-[clamp(1.5rem,8vw,4.5rem)] font-black leading-tight text-white italic break-words">
                            {step}
                        </h2>
                    </div>
                {/each}
                
                <div class="snap-start min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-green-500 rounded-[40px] border-[10px] border-white shadow-2xl text-white">
                    <span class="text-8xl mb-6">🏁</span>
                    <p class="text-5xl font-black uppercase leading-none">Arrived!</p>
                </div>
            </div>
        </div>
    {/if}
</main>

<style>
    :global(body) { 
        overflow: hidden; 
        overscroll-behavior: none; 
        background-color: #020617; 
        -webkit-font-smoothing: antialiased;
    }
    
    /* Hide scrollbar for a cleaner "app" feel */
    div::-webkit-scrollbar {
        display: none;
    }
</style>