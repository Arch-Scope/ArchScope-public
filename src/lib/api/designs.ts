export async function createDesign(token: string, data: any) {
  const res = await fetch('/api/designs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Failed to create design');
  }

  return json;
}

export async function updateDesign(token: string, id: string, data: any) {
  const res = await fetch(`/api/designs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || 'Failed to update design');
  }

  return json;
}