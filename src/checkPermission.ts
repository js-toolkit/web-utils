declare global {
  interface PermissionDescriptorNew {
    name: PermissionName | 'clipboard-write';
  }

  interface Permissions {
    query(permissionDesc: PermissionDescriptorNew): Promise<PermissionStatus>;
  }
}

export async function checkPermission(
  name: PermissionDescriptorNew['name']
): Promise<PermissionState | undefined> {
  try {
    const result = await navigator.permissions?.query?.({ name });
    return result.state;
  } catch {}
  return undefined;
}
