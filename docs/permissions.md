# Access rules

| Action                                  | Owner | Admin           | Member                | Viewer                | Client                   |
| --------------------------------------- | ----- | --------------- | --------------------- | --------------------- | ------------------------ |
| Create project                          | Yes   | Yes             | No                    | No                    | No                       |
| Invite people                           | Yes   | Yes             | No                    | No                    | No                       |
| Change member roles                     | Yes   | Non-admin roles | No                    | No                    | No                       |
| Grant project access                    | Yes   | Yes             | No                    | No                    | No                       |
| Read team projects                      | All   | All             | Yes                   | Yes                   | Explicit assignment only |
| Read private projects                   | All   | All             | Explicit assignment   | Explicit assignment   | Explicit assignment      |
| Read internal tasks                     | Yes   | Yes             | In permitted projects | In permitted projects | No                       |
| Read client-shared tasks                | Yes   | Yes             | In permitted projects | In permitted projects | In granted projects      |
| Create/edit/delete tasks and checklists | Yes   | Yes             | In permitted projects | No                    | No                       |
| Comment on tasks                        | Yes   | Yes             | In permitted projects | No                    | Shared tasks only        |

The owner’s role cannot be edited. Users cannot change their own role. Only the owner manages admin roles. Personal workspaces are owner-only. No request gains permission solely because the interface displays a control: every live API request is authorized independently.

Owners and admins can rename workspaces and edit/archive/restore projects. Only owners can remove admins; nobody can remove the owner or themselves through member management. Removal revokes explicit project access and unassigns tasks in that workspace. Owners/admins can revoke pending invitations, with admin-role invitations reserved for owners.
