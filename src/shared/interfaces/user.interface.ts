import { UserRole } from '../../modules/users/enums/user-role.enum';

export interface UserWithoutPassword {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}
