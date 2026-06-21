import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { command } = await req.json();

    if (!command) {
      return NextResponse.json({ error: 'No command provided' }, { status: 400 });
    }

    // MVP: For now, we simply echo the command and acknowledge receipt.
    // Future: This is where we will parse the AQL command, update DB, or pass it to an LLM.
    
    // Simulate some processing delay to feel like a real terminal executing
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      message: `Successfully received AQL command: "${command}"`,
      data: null,
    }, { status: 200 });

  } catch (error: any) {
    console.error('AQL Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the command' },
      { status: 500 }
    );
  }
}
